// Media Foundation event ordering follows Microsoft's MIT-licensed VirtualCamera sample.
// See native/reference/Microsoft-LICENSE and native/README.md.
#include "protocol.h"
#include <mfapi.h>
#include <mfidl.h>
#include <mferror.h>
#include <evr.h>
#include <ks.h>
#include <ksmedia.h>
#include <ksproxy.h>
#include <wrl.h>
#include <atomic>
#include <mutex>

using Microsoft::WRL::ComPtr;
using Microsoft::WRL::RuntimeClass;
using Microsoft::WRL::RuntimeClassFlags;
using Microsoft::WRL::ClassicCom;
using Microsoft::WRL::Make;
static std::atomic<long> objects{0};
struct Lifetime { Lifetime() { ++objects; } ~Lifetime() { --objects; } };
#define CHECK(call) do { HRESULT result = (call); if (FAILED(result)) return result; } while (0)

class Stream final : public RuntimeClass<RuntimeClassFlags<ClassicCom>, Microsoft::WRL::ChainInterfaces<IMFMediaStream2, IMFMediaStream, IMFMediaEventGenerator>>, private Lifetime {
  std::recursive_mutex mutex;
  ComPtr<IMFMediaSource> parent;
  ComPtr<IMFMediaEventQueue> events;
  ComPtr<IMFStreamDescriptor> descriptor;
  ComPtr<IMFVideoSampleAllocator> allocator;
  MF_STREAM_STATE state = MF_STREAM_STATE_STOPPED;
  bool shutdown = false, allocatorReady = false;
  LONGLONG nextTime = 0;
  FrameClient frames;
  std::vector<BYTE> pixels;
public:
  HRESULT initialize(IMFMediaSource* source) {
    parent = source;
    CHECK(MFCreateEventQueue(&events));
    ComPtr<IMFMediaType> type;
    CHECK(MFCreateMediaType(&type));
    CHECK(type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video));
    CHECK(type->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_NV12));
    CHECK(type->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive));
    CHECK(type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE));
    CHECK(type->SetUINT32(MF_MT_FIXED_SIZE_SAMPLES, TRUE));
    CHECK(type->SetUINT32(MF_MT_SAMPLE_SIZE, Nv12Bytes));
    CHECK(type->SetUINT32(MF_MT_DEFAULT_STRIDE, Width));
    CHECK(MFSetAttributeSize(type.Get(), MF_MT_FRAME_SIZE, Width, Height));
    CHECK(MFSetAttributeRatio(type.Get(), MF_MT_FRAME_RATE, 30, 1));
    CHECK(MFSetAttributeRatio(type.Get(), MF_MT_PIXEL_ASPECT_RATIO, 1, 1));
    IMFMediaType* types[] = { type.Get() };
    CHECK(MFCreateStreamDescriptor(0, 1, types, &descriptor));
    ComPtr<IMFMediaTypeHandler> handler;
    CHECK(descriptor->GetMediaTypeHandler(&handler));
    CHECK(handler->SetCurrentMediaType(type.Get()));
    CHECK(descriptor->SetGUID(MF_DEVICESTREAM_STREAM_CATEGORY, PINNAME_VIDEO_CAPTURE));
    CHECK(descriptor->SetUINT32(MF_DEVICESTREAM_STREAM_ID, 0));
    CHECK(descriptor->SetUINT32(MF_DEVICESTREAM_FRAMESERVER_SHARED, TRUE));
    CHECK(descriptor->SetUINT32(MF_DEVICESTREAM_ATTRIBUTE_FRAMESOURCE_TYPES, MFFrameSourceTypes_Color));
    BlackFrame(pixels);
    return S_OK;
  }
  HRESULT setAllocator(IUnknown* value) {
    std::lock_guard lock(mutex);
    if (shutdown) return MF_E_SHUTDOWN;
    if (!value) return E_POINTER;
    if (allocatorReady) return MF_E_INVALIDREQUEST;
    return value->QueryInterface(IID_PPV_ARGS(&allocator));
  }
  HRESULT start(IMFMediaType* type) {
    std::lock_guard lock(mutex);
    if (shutdown) return MF_E_SHUTDOWN;
    if (!allocator) CHECK(MFCreateVideoSampleAllocator(IID_PPV_ARGS(&allocator)));
    if (allocatorReady) { CHECK(allocator->UninitializeSampleAllocator()); allocatorReady = false; }
    CHECK(allocator->InitializeSampleAllocator(5, type)); allocatorReady = true;
    ComPtr<IMFMediaTypeHandler> handler;
    CHECK(descriptor->GetMediaTypeHandler(&handler)); CHECK(handler->SetCurrentMediaType(type));
    state = MF_STREAM_STATE_RUNNING; nextTime = 0;
    PROPVARIANT position{}; position.vt = VT_I8; position.hVal.QuadPart = MFGetSystemTime();
    return events->QueueEventParamVar(MEStreamStarted, GUID_NULL, S_OK, &position);
  }
  HRESULT stop() {
    std::lock_guard lock(mutex);
    if (shutdown) return MF_E_SHUTDOWN;
    state = MF_STREAM_STATE_STOPPED;
    return events->QueueEventParamVar(MEStreamStopped, GUID_NULL, S_OK, nullptr);
  }
  void close() {
    std::lock_guard lock(mutex);
    if (shutdown) return;
    shutdown = true; state = MF_STREAM_STATE_STOPPED;
    if (events) events->Shutdown();
    if (allocator && allocatorReady) allocator->UninitializeSampleAllocator();
    allocator.Reset(); parent.Reset(); descriptor.Reset();
  }
  STDMETHODIMP GetMediaSource(IMFMediaSource** value) override { std::lock_guard lock(mutex); return shutdown ? MF_E_SHUTDOWN : parent.CopyTo(value); }
  STDMETHODIMP GetStreamDescriptor(IMFStreamDescriptor** value) override { std::lock_guard lock(mutex); return shutdown ? MF_E_SHUTDOWN : descriptor.CopyTo(value); }
  STDMETHODIMP GetEvent(DWORD flags, IMFMediaEvent** value) override { return events->GetEvent(flags, value); }
  STDMETHODIMP BeginGetEvent(IMFAsyncCallback* callback, IUnknown* value) override { return events->BeginGetEvent(callback, value); }
  STDMETHODIMP EndGetEvent(IMFAsyncResult* result, IMFMediaEvent** value) override { return events->EndGetEvent(result, value); }
  STDMETHODIMP QueueEvent(MediaEventType type, REFGUID guid, HRESULT status, const PROPVARIANT* value) override { return events->QueueEventParamVar(type, guid, status, value); }
  STDMETHODIMP GetStreamState(MF_STREAM_STATE* value) override { std::lock_guard lock(mutex); if (!value) return E_POINTER; if (shutdown) return MF_E_SHUTDOWN; *value = state; return S_OK; }
  STDMETHODIMP SetStreamState(MF_STREAM_STATE value) override {
    std::lock_guard lock(mutex);
    if (shutdown) return MF_E_SHUTDOWN;
    if (value != MF_STREAM_STATE_RUNNING && value != MF_STREAM_STATE_PAUSED && value != MF_STREAM_STATE_STOPPED) return E_INVALIDARG;
    state = value; return S_OK;
  }
  STDMETHODIMP RequestSample(IUnknown* token) override {
    std::lock_guard lock(mutex);
    if (shutdown) return MF_E_SHUTDOWN;
    if (state != MF_STREAM_STATE_RUNNING || !allocatorReady) return MF_E_INVALIDREQUEST;
    auto now = MFGetSystemTime();
    if (nextTime > now) Sleep(static_cast<DWORD>(std::min<LONGLONG>((nextTime - now) / 10000, 34)));
    now = MFGetSystemTime(); nextTime = now + FrameDuration;
    if (!frames.read(pixels)) BlackFrame(pixels);
    ComPtr<IMFSample> sample; ComPtr<IMFMediaBuffer> buffer;
    CHECK(allocator->AllocateSample(&sample)); CHECK(sample->GetBufferByIndex(0, &buffer));
    ComPtr<IMF2DBuffer> twoD;
    if (SUCCEEDED(buffer.As(&twoD))) CHECK(twoD->ContiguousCopyFrom(pixels.data(), Nv12Bytes));
    else {
      BYTE* destination = nullptr; DWORD capacity = 0;
      CHECK(buffer->Lock(&destination, &capacity, nullptr));
      if (capacity < Nv12Bytes) { buffer->Unlock(); return MF_E_BUFFERTOOSMALL; }
      memcpy(destination, pixels.data(), Nv12Bytes); CHECK(buffer->Unlock()); CHECK(buffer->SetCurrentLength(Nv12Bytes));
    }
    CHECK(sample->SetSampleTime(now)); CHECK(sample->SetSampleDuration(FrameDuration));
    if (token) CHECK(sample->SetUnknown(MFSampleExtension_Token, token));
    return events->QueueEventParamUnk(MEMediaSample, GUID_NULL, S_OK, sample.Get());
  }
};

class Source final : public RuntimeClass<RuntimeClassFlags<ClassicCom>, Microsoft::WRL::ChainInterfaces<IMFMediaSourceEx, IMFMediaSource, IMFMediaEventGenerator>, IMFGetService, IKsControl, IMFSampleAllocatorControl>, private Lifetime {
  std::recursive_mutex mutex;
  ComPtr<IMFMediaEventQueue> events;
  ComPtr<IMFAttributes> attributes;
  ComPtr<IMFPresentationDescriptor> presentation;
  ComPtr<Stream> stream;
  bool shutdown = false, announced = false;
public:
  HRESULT initialize(IMFAttributes* activation) {
    CHECK(MFCreateAttributes(&attributes, 4));
    if (activation) CHECK(activation->CopyAllItems(attributes.Get()));
    ComPtr<IMFSensorProfileCollection> profiles; ComPtr<IMFSensorProfile> profile;
    CHECK(MFCreateSensorProfileCollection(&profiles));
    CHECK(MFCreateSensorProfile(KSCAMERAPROFILE_Legacy, 0, nullptr, &profile));
    CHECK(profile->AddProfileFilter(0, L"((RES==;FRT<=30,1;SUT==))")); CHECK(profiles->AddProfile(profile.Get()));
    CHECK(attributes->SetUnknown(MF_DEVICEMFT_SENSORPROFILE_COLLECTION, profiles.Get()));
    CHECK(MFCreateEventQueue(&events));
    stream = Make<Stream>(); if (!stream) return E_OUTOFMEMORY;
    CHECK(stream->initialize(this));
    ComPtr<IMFStreamDescriptor> descriptor; CHECK(stream->GetStreamDescriptor(&descriptor));
    IMFStreamDescriptor* descriptors[] = { descriptor.Get() };
    CHECK(MFCreatePresentationDescriptor(1, descriptors, &presentation));
    CHECK(presentation->SelectStream(0));
    return S_OK;
  }
  STDMETHODIMP GetEvent(DWORD flags, IMFMediaEvent** value) override { return events->GetEvent(flags, value); }
  STDMETHODIMP BeginGetEvent(IMFAsyncCallback* callback, IUnknown* value) override { return events->BeginGetEvent(callback, value); }
  STDMETHODIMP EndGetEvent(IMFAsyncResult* result, IMFMediaEvent** value) override { return events->EndGetEvent(result, value); }
  STDMETHODIMP QueueEvent(MediaEventType type, REFGUID guid, HRESULT status, const PROPVARIANT* value) override { return events->QueueEventParamVar(type, guid, status, value); }
  STDMETHODIMP GetCharacteristics(DWORD* flags) override { std::lock_guard lock(mutex); if (!flags) return E_POINTER; if (shutdown) return MF_E_SHUTDOWN; *flags = MFMEDIASOURCE_IS_LIVE; return S_OK; }
  STDMETHODIMP CreatePresentationDescriptor(IMFPresentationDescriptor** value) override { std::lock_guard lock(mutex); return shutdown ? MF_E_SHUTDOWN : presentation->Clone(value); }
  STDMETHODIMP Pause() override { return MF_E_INVALID_STATE_TRANSITION; }
  STDMETHODIMP Shutdown() override {
    std::lock_guard lock(mutex);
    if (shutdown) return S_OK;
    shutdown = true;
    if (stream) stream->close();
    if (events) events->Shutdown();
    stream.Reset(); presentation.Reset(); attributes.Reset(); return S_OK;
  }
  STDMETHODIMP Start(IMFPresentationDescriptor* descriptor, const GUID* format, const PROPVARIANT* position) override {
    std::lock_guard lock(mutex);
    if (shutdown) return MF_E_SHUTDOWN;
    if (!descriptor || !position) return E_POINTER;
    if (format && *format != GUID_NULL) return MF_E_UNSUPPORTED_TIME_FORMAT;
    if (position->vt != VT_EMPTY && (position->vt != VT_I8 || position->hVal.QuadPart != 0)) return MF_E_INVALIDREQUEST;
    DWORD count = 0; CHECK(descriptor->GetStreamDescriptorCount(&count)); if (count != 1) return E_INVALIDARG;
    BOOL selected = FALSE; ComPtr<IMFStreamDescriptor> sd;
    CHECK(descriptor->GetStreamDescriptorByIndex(0, &selected, &sd)); if (!selected) return E_INVALIDARG;
    DWORD id = 0; CHECK(sd->GetStreamIdentifier(&id)); if (id != 0) return MF_E_INVALIDSTREAMNUMBER;
    ComPtr<IMFMediaTypeHandler> handler; ComPtr<IMFMediaType> type;
    CHECK(sd->GetMediaTypeHandler(&handler)); CHECK(handler->GetCurrentMediaType(&type));
    ComPtr<IMFStreamDescriptor> ours; CHECK(stream->GetStreamDescriptor(&ours));
    ComPtr<IMFMediaTypeHandler> ownHandler; CHECK(ours->GetMediaTypeHandler(&ownHandler)); CHECK(ownHandler->IsMediaTypeSupported(type.Get(), nullptr));
    CHECK(events->QueueEventParamUnk(announced ? MEUpdatedStream : MENewStream, GUID_NULL, S_OK, stream.Get()));
    CHECK(stream->start(type.Get())); announced = true;
    PROPVARIANT time{}; time.vt = VT_I8; time.hVal.QuadPart = MFGetSystemTime();
    return events->QueueEventParamVar(MESourceStarted, GUID_NULL, S_OK, &time);
  }
  STDMETHODIMP Stop() override { std::lock_guard lock(mutex); if (shutdown) return MF_E_SHUTDOWN; CHECK(stream->stop()); return events->QueueEventParamVar(MESourceStopped, GUID_NULL, S_OK, nullptr); }
  STDMETHODIMP GetSourceAttributes(IMFAttributes** value) override { std::lock_guard lock(mutex); return shutdown ? MF_E_SHUTDOWN : attributes.CopyTo(value); }
  STDMETHODIMP GetStreamAttributes(DWORD id, IMFAttributes** value) override {
    std::lock_guard lock(mutex); if (shutdown) return MF_E_SHUTDOWN; if (id != 0) return MF_E_INVALIDSTREAMNUMBER;
    ComPtr<IMFStreamDescriptor> sd; CHECK(stream->GetStreamDescriptor(&sd)); return sd.CopyTo(value);
  }
  STDMETHODIMP SetD3DManager(IUnknown*) override { return S_OK; }
  STDMETHODIMP GetService(REFGUID, REFIID, LPVOID* value) override { if (!value) return E_POINTER; *value = nullptr; return MF_E_UNSUPPORTED_SERVICE; }
  STDMETHODIMP SetDefaultAllocator(DWORD id, IUnknown* allocator) override { std::lock_guard lock(mutex); if (shutdown) return MF_E_SHUTDOWN; return id == 0 ? stream->setAllocator(allocator) : MF_E_INVALIDSTREAMNUMBER; }
  STDMETHODIMP GetAllocatorUsage(DWORD id, DWORD* input, MFSampleAllocatorUsage* usage) override { if (!input || !usage) return E_POINTER; if (id != 0) return MF_E_INVALIDSTREAMNUMBER; *input = 0; *usage = MFSampleAllocatorUsage_UsesProvidedAllocator; return S_OK; }
  STDMETHODIMP KsProperty(PKSPROPERTY, ULONG, LPVOID, ULONG, ULONG* returned) override { if (!returned) return E_POINTER; *returned = 0; return HRESULT_FROM_WIN32(ERROR_SET_NOT_FOUND); }
  STDMETHODIMP KsMethod(PKSMETHOD, ULONG, LPVOID, ULONG, ULONG* returned) override { if (!returned) return E_POINTER; *returned = 0; return HRESULT_FROM_WIN32(ERROR_SET_NOT_FOUND); }
  STDMETHODIMP KsEvent(PKSEVENT, ULONG, LPVOID, ULONG, ULONG* returned) override { if (returned) *returned = 0; return HRESULT_FROM_WIN32(ERROR_SET_NOT_FOUND); }
};

class Activation final : public RuntimeClass<RuntimeClassFlags<ClassicCom>, Microsoft::WRL::ChainInterfaces<IMFActivate, IMFAttributes>>, private Lifetime {
  std::recursive_mutex mutex;
  ComPtr<IMFAttributes> attributes;
  ComPtr<Source> source;
public:
  HRESULT initialize() { return MFCreateAttributes(&attributes, 8); }
  // The caller owns an activated source independently of this factory object.
  ~Activation() = default;
  STDMETHODIMP ActivateObject(REFIID iid, void** value) override {
    std::lock_guard lock(mutex); if (!value) return E_POINTER; *value = nullptr;
    if (!source) { auto instance = Make<Source>(); if (!instance) return E_OUTOFMEMORY; HRESULT hr = instance->initialize(attributes.Get()); if (FAILED(hr)) { instance->Shutdown(); return hr; } source = instance; }
    return source.CopyTo(iid, value);
  }
  STDMETHODIMP ShutdownObject() override { std::lock_guard lock(mutex); if (source) source->Shutdown(); source.Reset(); return S_OK; }
  STDMETHODIMP DetachObject() override { std::lock_guard lock(mutex); source.Reset(); return S_OK; }
  STDMETHODIMP GetItem(REFGUID k, PROPVARIANT* v) override { return attributes->GetItem(k,v); }
  STDMETHODIMP GetItemType(REFGUID k, MF_ATTRIBUTE_TYPE* v) override { return attributes->GetItemType(k,v); }
  STDMETHODIMP CompareItem(REFGUID k, REFPROPVARIANT v, BOOL* r) override { return attributes->CompareItem(k,v,r); }
  STDMETHODIMP Compare(IMFAttributes* a, MF_ATTRIBUTES_MATCH_TYPE t, BOOL* r) override { return attributes->Compare(a,t,r); }
  STDMETHODIMP GetUINT32(REFGUID k, UINT32* v) override { return attributes->GetUINT32(k,v); }
  STDMETHODIMP GetUINT64(REFGUID k, UINT64* v) override { return attributes->GetUINT64(k,v); }
  STDMETHODIMP GetDouble(REFGUID k, double* v) override { return attributes->GetDouble(k,v); }
  STDMETHODIMP GetGUID(REFGUID k, GUID* v) override { return attributes->GetGUID(k,v); }
  STDMETHODIMP GetStringLength(REFGUID k, UINT32* n) override { return attributes->GetStringLength(k,n); }
  STDMETHODIMP GetString(REFGUID k, LPWSTR v, UINT32 n, UINT32* used) override { return attributes->GetString(k,v,n,used); }
  STDMETHODIMP GetAllocatedString(REFGUID k, LPWSTR* v, UINT32* n) override { return attributes->GetAllocatedString(k,v,n); }
  STDMETHODIMP GetBlobSize(REFGUID k, UINT32* n) override { return attributes->GetBlobSize(k,n); }
  STDMETHODIMP GetBlob(REFGUID k, UINT8* v, UINT32 n, UINT32* used) override { return attributes->GetBlob(k,v,n,used); }
  STDMETHODIMP GetAllocatedBlob(REFGUID k, UINT8** v, UINT32* n) override { return attributes->GetAllocatedBlob(k,v,n); }
  STDMETHODIMP GetUnknown(REFGUID k, REFIID iid, LPVOID* v) override { return attributes->GetUnknown(k,iid,v); }
  STDMETHODIMP SetItem(REFGUID k, REFPROPVARIANT v) override { return attributes->SetItem(k,v); }
  STDMETHODIMP DeleteItem(REFGUID k) override { return attributes->DeleteItem(k); }
  STDMETHODIMP DeleteAllItems() override { return attributes->DeleteAllItems(); }
  STDMETHODIMP SetUINT32(REFGUID k, UINT32 v) override { return attributes->SetUINT32(k,v); }
  STDMETHODIMP SetUINT64(REFGUID k, UINT64 v) override { return attributes->SetUINT64(k,v); }
  STDMETHODIMP SetDouble(REFGUID k, double v) override { return attributes->SetDouble(k,v); }
  STDMETHODIMP SetGUID(REFGUID k, REFGUID v) override { return attributes->SetGUID(k,v); }
  STDMETHODIMP SetString(REFGUID k, LPCWSTR v) override { return attributes->SetString(k,v); }
  STDMETHODIMP SetBlob(REFGUID k, const UINT8* v, UINT32 n) override { return attributes->SetBlob(k,v,n); }
  STDMETHODIMP SetUnknown(REFGUID k, IUnknown* v) override { return attributes->SetUnknown(k,v); }
  STDMETHODIMP LockStore() override { return attributes->LockStore(); }
  STDMETHODIMP UnlockStore() override { return attributes->UnlockStore(); }
  STDMETHODIMP GetCount(UINT32* n) override { return attributes->GetCount(n); }
  STDMETHODIMP GetItemByIndex(UINT32 i, GUID* k, PROPVARIANT* v) override { return attributes->GetItemByIndex(i,k,v); }
  STDMETHODIMP CopyAllItems(IMFAttributes* value) override { return attributes->CopyAllItems(value); }
};

class Factory final : public RuntimeClass<RuntimeClassFlags<ClassicCom>, IClassFactory>, private Lifetime {
public:
  STDMETHODIMP CreateInstance(IUnknown* outer, REFIID iid, void** value) override {
    if (!value) return E_POINTER; *value = nullptr;
    if (outer) return CLASS_E_NOAGGREGATION;
    auto activation = Make<Activation>(); if (!activation) return E_OUTOFMEMORY;
    CHECK(activation->initialize()); return activation.CopyTo(iid, value);
  }
  STDMETHODIMP LockServer(BOOL lock) override { if (lock) ++objects; else --objects; return S_OK; }
};
extern "C" HRESULT __stdcall DllGetClassObject(REFCLSID clsid, REFIID iid, void** value) {
  if (!value) return E_POINTER; *value = nullptr;
  if (clsid != CameraClsid) return CLASS_E_CLASSNOTAVAILABLE;
  auto factory = Make<Factory>(); return factory ? factory.CopyTo(iid, value) : E_OUTOFMEMORY;
}
extern "C" HRESULT __stdcall DllCanUnloadNow() { return objects == 0 ? S_OK : S_FALSE; }
