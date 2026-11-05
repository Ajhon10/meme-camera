#include "protocol.h"
#include <mfapi.h>
#include <mfidl.h>
#include <mfvirtualcamera.h>
#include <mfreadwrite.h>
#include <wrl.h>
#include <sddl.h>
#include <shlobj.h>
#include <shellapi.h>
#include <filesystem>
#include <iostream>
#include <mutex>
#include <thread>
#include <atomic>
#include <array>
using Microsoft::WRL::ComPtr;
namespace fs = std::filesystem;
static std::atomic<bool> stopping{false};
static std::mutex frameMutex;
static std::vector<BYTE> latest;
static ULONGLONG received = 0;
static uint64_t sequence = 0;
static std::wstring registryKey = std::wstring(L"Software\\Classes\\CLSID\\") + CameraClsidText;
static fs::path executable() { wchar_t path[32768]; GetModuleFileNameW(nullptr,path,32768); return path; }
static fs::path installedDll() { PWSTR path = nullptr; if (FAILED(SHGetKnownFolderPath(FOLDERID_ProgramFiles,0,nullptr,&path))) throw std::runtime_error("Cannot locate Program Files"); fs::path result = fs::path(path)/L"MemeCam Virtual Camera"/L"MemeCamMediaSource.dll"; CoTaskMemFree(path); return result; }
static int failure(const char* message, HRESULT hr) { std::cerr << message << " (0x" << std::hex << static_cast<unsigned long>(hr) << ")\n"; return 1; }
static int install(bool remove) {
  auto target = installedDll();
  if (remove) {
    auto result = RegDeleteTreeW(HKEY_LOCAL_MACHINE,registryKey.c_str());
    if (result != ERROR_SUCCESS && result != ERROR_FILE_NOT_FOUND) return failure("Cannot unregister camera",HRESULT_FROM_WIN32(result));
    if (fs::exists(target) && !DeleteFileW(target.c_str())) return failure("Close camera apps before removing the camera DLL",HRESULT_FROM_WIN32(GetLastError()));
    return 0;
  }
  fs::create_directories(target.parent_path());
  if (!CopyFileW((executable().parent_path()/L"MemeCamMediaSource.dll").c_str(),target.c_str(),FALSE)) return failure("Cannot copy camera DLL; close camera apps before updating",HRESULT_FROM_WIN32(GetLastError()));
  HKEY key = nullptr;
  auto result = RegCreateKeyExW(HKEY_LOCAL_MACHINE,(registryKey+L"\\InprocServer32").c_str(),0,nullptr,0,KEY_WRITE|KEY_WOW64_64KEY,nullptr,&key,nullptr);
  if (result != ERROR_SUCCESS) return failure("Cannot register camera",HRESULT_FROM_WIN32(result));
  auto name = target.wstring();
  result = RegSetValueExW(key,nullptr,0,REG_SZ,reinterpret_cast<const BYTE*>(name.c_str()),static_cast<DWORD>((name.size()+1)*sizeof(wchar_t)));
  if (result == ERROR_SUCCESS) result = RegSetValueExW(key,L"ThreadingModel",0,REG_SZ,reinterpret_cast<const BYTE*>(L"Both"),10);
  RegCloseKey(key);
  return result == ERROR_SUCCESS ? 0 : failure("Cannot register camera",HRESULT_FROM_WIN32(result));
}
static int elevate(bool remove) {
  auto path = executable().wstring();
  SHELLEXECUTEINFOW info{sizeof(info)}; info.fMask=SEE_MASK_NOCLOSEPROCESS; info.lpVerb=L"runas"; info.lpFile=path.c_str(); info.lpParameters=remove?L"--uninstall":L"--install"; info.nShow=SW_HIDE;
  if (!ShellExecuteExW(&info)) return failure("Windows camera setup was cancelled or failed",HRESULT_FROM_WIN32(GetLastError()));
  Handle process(info.hProcess); WaitForSingleObject(process.value,INFINITE); DWORD code=1; GetExitCodeProcess(process.value,&code); return static_cast<int>(code);
}
static void convert(const std::vector<BYTE>& rgba, std::vector<BYTE>& nv12) {
  nv12.resize(Nv12Bytes);
  auto clamp=[](int n){return static_cast<BYTE>(std::clamp(n,0,255));};
  for (unsigned y=0;y<Height;y++) for(unsigned x=0;x<Width;x++) {
    auto i=(y*Width+x)*4; int r=rgba[i],g=rgba[i+1],b=rgba[i+2];
    nv12[y*Width+x]=clamp(((47*r+157*g+16*b+128)>>8)+16);
    if (!(x%2) && !(y%2)) {
      r=g=b=0;
      for(unsigned dy=0;dy<2;dy++) for(unsigned dx=0;dx<2;dx++) { auto j=((y+dy)*Width+x+dx)*4; r+=rgba[j];g+=rgba[j+1];b+=rgba[j+2]; }
      r/=4;g/=4;b/=4; auto uv=Width*Height+(y/2)*Width+x;
      nv12[uv]=clamp(((-26*r-87*g+112*b+128)>>8)+128);
      nv12[uv+1]=clamp(((112*r-102*g-10*b+128)>>8)+128);
    }
  }
}
static void serve(HANDLE pipe) {
  std::vector<BYTE> pixels; BlackFrame(pixels);
  while (!stopping) {
    Handle event(CreateEventW(nullptr,TRUE,FALSE,nullptr)); OVERLAPPED overlap{}; overlap.hEvent=event.value;
    BOOL connected=ConnectNamedPipe(pipe,&overlap); DWORD error=connected?ERROR_SUCCESS:GetLastError();
    if (!connected && error==ERROR_IO_PENDING) {
      while (!stopping && WaitForSingleObject(event.value,100)==WAIT_TIMEOUT) {}
      if(stopping) CancelIoEx(pipe,&overlap);
      DWORD ignored=0; connected=GetOverlappedResult(pipe,&overlap,&ignored,TRUE);
    } else if(error==ERROR_PIPE_CONNECTED) connected=TRUE;
    if (connected) while(!stopping) {
      BYTE request=0;
      if(!Transfer(pipe,&request,1,false,1000) || request!=1) break;
      FrameHeader header;
      { std::lock_guard lock(frameMutex); if(received && GetTickCount64()-received<500) pixels=latest; else BlackFrame(pixels); header.sequence=sequence; }
      if(!Transfer(pipe,&header,sizeof(header),true) || !Transfer(pipe,pixels.data(),Nv12Bytes,true)) break;
    }
    DisconnectNamedPipe(pipe);
  }
}
static int run() {
  Handle token; if(!OpenProcessToken(GetCurrentProcess(),TOKEN_QUERY,&token.value)) return 1;
  DWORD bytes=0; GetTokenInformation(token.value,TokenUser,nullptr,0,&bytes); std::vector<BYTE> data(bytes);
  if(!GetTokenInformation(token.value,TokenUser,data.data(),bytes,&bytes)) return 1;
  LPWSTR sid=nullptr; if(!ConvertSidToStringSidW(reinterpret_cast<TOKEN_USER*>(data.data())->User.Sid,&sid)) return 1;
  std::wstring sddl=L"D:P(A;;GA;;;SY)(A;;GA;;;LS)(A;;GA;;;NS)(A;;GA;;;"; sddl+=sid; sddl+=L")"; LocalFree(sid);
  PSECURITY_DESCRIPTOR descriptor=nullptr;
  if(!ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl.c_str(),SDDL_REVISION_1,&descriptor,nullptr)) return 1;
  SECURITY_ATTRIBUTES security{sizeof(security),descriptor,FALSE};
  std::array<Handle,4> pipes;
  for(size_t i=0;i<pipes.size();i++) {
    pipes[i].value=CreateNamedPipeW(PipeName,PIPE_ACCESS_DUPLEX|FILE_FLAG_OVERLAPPED|(i==0?FILE_FLAG_FIRST_PIPE_INSTANCE:0),PIPE_TYPE_BYTE|PIPE_READMODE_BYTE|PIPE_WAIT|PIPE_REJECT_REMOTE_CLIENTS,4,Nv12Bytes+16,16,1000,&security);
    if(pipes[i].value==INVALID_HANDLE_VALUE) { auto error=GetLastError(); LocalFree(descriptor); return failure("Cannot open frame bridge; another MemeCam may be running",HRESULT_FROM_WIN32(error)); }
  }
  LocalFree(descriptor); BlackFrame(latest);
  ComPtr<IMFVirtualCamera> camera;
  HRESULT hr=MFCreateVirtualCamera(MFVirtualCameraType_SoftwareCameraSource,MFVirtualCameraLifetime_Session,MFVirtualCameraAccess_CurrentUser,L"MemeCam",CameraClsidText,nullptr,0,&camera);
  if(FAILED(hr)) return failure("Windows 11 virtual camera creation failed",hr);
  hr=camera->Start(nullptr);
  if(FAILED(hr)) { camera->Shutdown(); return failure("Camera could not start; install the camera component and enable Windows camera access",hr); }
  std::vector<std::thread> workers; for(auto& pipe:pipes) workers.emplace_back(serve,pipe.value);
  std::cout << "ready\n" << std::flush;
  std::vector<BYTE> rgba(RgbaBytes),converted;
  HANDLE input=GetStdHandle(STD_INPUT_HANDLE);
  while(true) {
    DWORD total=0;
    while(total<RgbaBytes) { DWORD count=0; if(!ReadFile(input,rgba.data()+total,RgbaBytes-total,&count,nullptr)||!count) break; total+=count; }
    if(total!=RgbaBytes) break;
    convert(rgba,converted);
    { std::lock_guard lock(frameMutex); latest.swap(converted); received=GetTickCount64(); ++sequence; }
    std::cout << "frame\n" << std::flush;
  }
  stopping=true;
  for(auto& worker:workers) worker.join();
  camera->Stop(); camera->Remove(); camera->Shutdown(); return 0;
}
static int probe() {
  ComPtr<IMFAttributes> attributes; MFCreateAttributes(&attributes,1); attributes->SetGUID(MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE,MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_GUID);
  IMFActivate** devices=nullptr; UINT32 count=0; HRESULT hr=MFEnumDeviceSources(attributes.Get(),&devices,&count); if(FAILED(hr)) return failure("Enumeration failed",hr);
  ComPtr<IMFMediaSource> source;
  for(UINT32 i=0;i<count;i++) { WCHAR* name=nullptr; UINT32 length=0; devices[i]->GetAllocatedString(MF_DEVSOURCE_ATTRIBUTE_FRIENDLY_NAME,&name,&length); if(name && wcsstr(name,L"MemeCam")) hr=devices[i]->ActivateObject(IID_PPV_ARGS(&source)); CoTaskMemFree(name); devices[i]->Release(); }
  CoTaskMemFree(devices); if(!source) return failure("MemeCam camera not available",FAILED(hr)?hr:E_FAIL);
  ComPtr<IMFSourceReader> reader; hr=MFCreateSourceReaderFromMediaSource(source.Get(),nullptr,&reader); if(FAILED(hr)) return failure("Reader creation failed",hr);
  ComPtr<IMFSample> sample; DWORD flags=0; LONGLONG time=0;
  for(int attempt=0;attempt<10 && !sample;attempt++) {
    hr=reader->ReadSample(static_cast<DWORD>(MF_SOURCE_READER_FIRST_VIDEO_STREAM),0,nullptr,&flags,&time,&sample);
    if(FAILED(hr)) break;
  }
  if(FAILED(hr)||!sample) return failure("Frame capture failed",FAILED(hr)?hr:E_FAIL);
  ComPtr<IMFMediaBuffer> buffer; sample->ConvertToContiguousBuffer(&buffer); DWORD length=0; buffer->GetCurrentLength(&length);
  BYTE* pixels=nullptr; buffer->Lock(&pixels,nullptr,nullptr); unsigned first=pixels[0]; buffer->Unlock();
  std::cout << "Captured " << length << " bytes; first luma=" << first << "\n";
  reader.Reset(); source->Shutdown(); return length==Nv12Bytes?0:1;
}
int wmain(int argc,wchar_t** argv) {
  try {
    std::wstring command=argc>1?argv[1]:L"--run";
    if(command==L"--install-ui" || command==L"--uninstall-ui") return elevate(command==L"--uninstall-ui");
    if(command==L"--install" || command==L"--uninstall") return install(command==L"--uninstall");
    if(command==L"--status") { wchar_t path[32768]; DWORD bytes=sizeof(path); auto result=RegGetValueW(HKEY_LOCAL_MACHINE,(registryKey+L"\\InprocServer32").c_str(),nullptr,RRF_RT_REG_SZ,nullptr,path,&bytes); return result==ERROR_SUCCESS && fs::path(path)==installedDll() && fs::exists(path)?0:1; }
    HRESULT hr=CoInitializeEx(nullptr,COINIT_MULTITHREADED); if(FAILED(hr)) return failure("COM startup failed",hr);
    hr=MFStartup(MF_VERSION); if(FAILED(hr)) return failure("Media Foundation startup failed",hr);
    int result=command==L"--probe"?probe():command==L"--run"?run():1;
    MFShutdown(); CoUninitialize(); return result;
  } catch(const std::exception& error) { std::cerr << error.what() << "\n"; return 1; }
}
