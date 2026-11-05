#pragma once
#include <windows.h>
#include <cstdint>
#include <vector>
#include <algorithm>

inline constexpr GUID CameraClsid = {0xf091dab7,0x8b12,0x4ec0,{0x8e,0xe4,0x03,0x9c,0x87,0x9a,0x72,0xa5}};
inline constexpr wchar_t CameraClsidText[] = L"{F091DAB7-8B12-4EC0-8EE4-039C879A72A5}";
inline constexpr wchar_t PipeName[] = L"\\\\.\\pipe\\MemeCam-F091DAB7-8B12-4EC0-8EE4-039C879A72A5";
inline constexpr DWORD Width = 1280, Height = 720, RgbaBytes = Width * Height * 4;
inline constexpr DWORD Nv12Bytes = Width * Height * 3 / 2;
inline constexpr LONGLONG FrameDuration = 10000000 / 30;
inline constexpr DWORD ProtocolMagic = 0x4d43414d;
struct FrameHeader { uint32_t magic = ProtocolMagic; uint32_t length = Nv12Bytes; uint64_t sequence = 0; };
static_assert(sizeof(FrameHeader) == 16);
inline void BlackFrame(std::vector<BYTE>& frame) {
  frame.resize(Nv12Bytes);
  std::fill(frame.begin(), frame.begin() + Width * Height, BYTE{16});
  std::fill(frame.begin() + Width * Height, frame.end(), BYTE{128});
}
class Handle {
public:
  HANDLE value = INVALID_HANDLE_VALUE;
  Handle() = default;
  explicit Handle(HANDLE handle): value(handle) {}
  ~Handle() { reset(); }
  Handle(const Handle&) = delete;
  Handle& operator=(const Handle&) = delete;
  void reset(HANDLE handle = INVALID_HANDLE_VALUE) { if (value && value != INVALID_HANDLE_VALUE) CloseHandle(value); value = handle; }
  explicit operator bool() const { return value && value != INVALID_HANDLE_VALUE; }
};
// All native pipe I/O has a deadline so a crashed consumer cannot hold FrameServer.
inline bool Transfer(HANDLE pipe, void* data, DWORD length, bool write, DWORD timeout = 250) {
  Handle event(CreateEventW(nullptr, TRUE, FALSE, nullptr));
  if (!event) return false;
  auto* bytes = static_cast<BYTE*>(data);
  while (length) {
    OVERLAPPED operation{}; operation.hEvent = event.value; ResetEvent(event.value);
    DWORD transferred = 0;
    BOOL success = write ? WriteFile(pipe, bytes, length, &transferred, &operation) : ReadFile(pipe, bytes, length, &transferred, &operation);
    if (!success) {
      if (GetLastError() != ERROR_IO_PENDING) return false;
      if (WaitForSingleObject(event.value, timeout) != WAIT_OBJECT_0) {
        CancelIoEx(pipe, &operation);
        GetOverlappedResult(pipe, &operation, &transferred, TRUE);
        return false;
      }
      if (!GetOverlappedResult(pipe, &operation, &transferred, FALSE)) return false;
    }
    if (!transferred) return false;
    bytes += transferred; length -= transferred;
  }
  return true;
}
class FrameClient {
  Handle pipe;
  ULONGLONG retryAfter = 0;
public:
  bool read(std::vector<BYTE>& output) {
    if (!pipe) {
      if (GetTickCount64() < retryAfter) return false;
      pipe.reset(CreateFileW(PipeName, GENERIC_READ | GENERIC_WRITE, 0, nullptr, OPEN_EXISTING, FILE_FLAG_OVERLAPPED | SECURITY_SQOS_PRESENT | SECURITY_IDENTIFICATION, nullptr));
      if (!pipe) { retryAfter = GetTickCount64() + 500; return false; }
    }
    BYTE request = 1; FrameHeader header;
    output.resize(Nv12Bytes);
    if (!Transfer(pipe.value, &request, 1, true) || !Transfer(pipe.value, &header, sizeof(header), false) || header.magic != ProtocolMagic || header.length != Nv12Bytes || !Transfer(pipe.value, output.data(), Nv12Bytes, false)) {
      pipe.reset(); retryAfter = GetTickCount64() + 500; return false;
    }
    return true;
  }
};
