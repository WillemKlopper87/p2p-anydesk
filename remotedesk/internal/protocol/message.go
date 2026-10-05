// Package protocol defines the wire protocol for RemoteDesk.
// Inspired by RustDesk's custom protocol and TeamViewer's relay approach.
package protocol

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"time"
)

// MessageType identifies the type of protocol message.
type MessageType uint8

const (
	// Control messages
	MsgHello          MessageType = 1  // Initial handshake
	MsgHelloAck       MessageType = 2  // Handshake acknowledgment
	MsgAuth           MessageType = 3  // Authentication
	MsgAuthResult     MessageType = 4  // Auth result
	MsgSessionInfo    MessageType = 5  // Session metadata
	MsgPing           MessageType = 6  // Keepalive ping
	MsgPong           MessageType = 7  // Keepalive response
	MsgDisconnect     MessageType = 8  // Graceful disconnect

	// Screen/streaming messages
	MsgVideoFrame     MessageType = 20 // Compressed video frame
	MsgCursorPos      MessageType = 21 // Cursor position update
	MsgCursorShape    MessageType = 22 // Cursor shape change
	MsgResolution     MessageType = 23 // Resolution change notification

	// Input messages
	MsgMouseEvent     MessageType = 40 // Mouse event
	MsgKeyboardEvent  MessageType = 41 // Keyboard event
	MsgTouchEvent     MessageType = 42 // Touch event (future)

	// File transfer messages (like RustDesk)
	MsgFileRequest    MessageType = 60 // File transfer request
	MsgFileData       MessageType = 61 // File data chunk
	MsgFileAck        MessageType = 62 // File data acknowledgment
	MsgFileComplete   MessageType = 63 // File transfer complete
	MsgDirList        MessageType = 64 // Directory listing request
	MsgDirListResult  MessageType = 65 // Directory listing response

	// Clipboard
	MsgClipboard      MessageType = 80 // Clipboard sync

	// Chat
	MsgChat           MessageType = 90 // Chat message
)

// Header is the fixed-size header for every protocol message.
// Format: [type(1)][flags(1)][seq(4)][payloadLen(4)] = 10 bytes
type Header struct {
	Type      MessageType
	Flags     uint8
	Seq       uint32
	PayloadLen uint32
}

const HeaderSize = 10

// Flag bits
const (
	FlagCompressed  uint8 = 1 << 0 // Payload is compressed
	FlagEncrypted   uint8 = 1 << 1 // Payload is encrypted
	FlagKeyFrame    uint8 = 1 << 2 // Video frame is a keyframe
	FlagRequestAck  uint8 = 1 << 3 // Sender requests acknowledgment
)

// WriteHeader writes a protocol header to the writer.
func WriteHeader(w io.Writer, h Header) error {
	buf := make([]byte, HeaderSize)
	buf[0] = byte(h.Type)
	buf[1] = h.Flags
	binary.BigEndian.PutUint32(buf[2:6], h.Seq)
	binary.BigEndian.PutUint32(buf[6:10], h.PayloadLen)
	_, err := w.Write(buf)
	return err
}

// ReadHeader reads a protocol header from the reader.
func ReadHeader(r io.Reader) (Header, error) {
	buf := make([]byte, HeaderSize)
	if _, err := io.ReadFull(r, buf); err != nil {
		return Header{}, err
	}
	return Header{
		Type:       MessageType(buf[0]),
		Flags:      buf[1],
		Seq:        binary.BigEndian.Uint32(buf[2:6]),
		PayloadLen: binary.BigEndian.Uint32(buf[6:10]),
	}, nil
}

// --- Message Payloads ---

// HelloMessage is sent during initial handshake.
type HelloMessage struct {
	Version     string   `json:"version"`
	PeerID      string   `json:"peer_id"`
	Hostname    string   `json:"hostname"`
	Username    string   `json:"username"`
	Platform    string   `json:"platform"`    // "linux", "windows", "darwin"
	Features    []string `json:"features"`    // Supported features
	DisplayInfo []DisplayInfo `json:"displays"` // Available displays
}

// DisplayInfo describes a display/monitor.
type DisplayInfo struct {
	Index  int    `json:"index"`
	Name   string `json:"name"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
	Scale  float64 `json:"scale"`
	Primary bool  `json:"primary"`
}

// AuthMessage for password-based authentication.
type AuthMessage struct {
	SessionID string `json:"session_id"`
	Token     string `json:"token"` // HMAC of session_id + password
	Nonce     []byte `json:"nonce"`
}

// AuthResultMessage indicates auth success/failure.
type AuthResultMessage struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Token   string `json:"token,omitempty"` // Session token for reconnection
}

// VideoFrame carries a compressed screen frame.
type VideoFrame struct {
	DisplayIndex int    `json:"display_index"`
	FrameNum     uint64 `json:"frame_num"`
	Timestamp    int64  `json:"timestamp"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	Format       string `json:"format"` // "jpeg", "vp8", "h264", "raw"
	Quality      int    `json:"quality"`
	Data         []byte `json:"-"` // Raw frame data (not JSON encoded)
}

// MouseEvent types
type MouseEventType uint8

const (
	MouseMove    MouseEventType = 0
	MouseDown    MouseEventType = 1
	MouseUp      MouseEventType = 2
	MouseClick   MouseEventType = 3
	MouseDblClick MouseEventType = 4
	MouseScroll  MouseEventType = 5
	MouseDrag    MouseEventType = 6
)

// MouseButton constants
const (
	MouseButtonLeft   uint8 = 0
	MouseButtonRight  uint8 = 1
	MouseButtonMiddle uint8 = 2
)

// MouseMessage represents a mouse input event.
type MouseMessage struct {
	Type    MouseEventType `json:"type"`
	Button  uint8          `json:"button"`
	X       float64        `json:"x"` // Normalized 0.0-1.0
	Y       float64        `json:"y"` // Normalized 0.0-1.0
	DeltaX  int32          `json:"delta_x,omitempty"`
	DeltaY  int32          `json:"delta_y,omitempty"`
	Modifiers uint8        `json:"modifiers"` // Bit flags: ctrl, shift, alt, meta
}

// KeyboardMessage represents a keyboard input event.
type KeyboardMessage struct {
	KeyDown    bool   `json:"key_down"`
	Key        string `json:"key"`
	ScanCode   uint32 `json:"scan_code"`
	Modifiers  uint8  `json:"modifiers"` // Bit flags: ctrl, shift, alt, meta
	Unicode    uint32 `json:"unicode,omitempty"`
}

// Modifier bit flags
const (
	ModCtrl  uint8 = 1 << 0
	ModShift uint8 = 1 << 1
	ModAlt   uint8 = 1 << 2
	ModMeta  uint8 = 1 << 3
)

// FileRequestMessage initiates a file transfer.
type FileRequestMessage struct {
	TransferID string `json:"transfer_id"`
	Direction  string `json:"direction"` // "upload" or "download"
	FilePath   string `json:"file_path"`
	FileSize   int64  `json:"file_size"`
	Overwrite  bool   `json:"overwrite"`
}

// FileDataMessage carries a chunk of file data.
type FileDataMessage struct {
	TransferID string `json:"transfer_id"`
	Offset     int64  `json:"offset"`
	Size       int32  `json:"size"`
	Data       []byte `json:"-"` // Raw data (not JSON encoded)
}

// ChatMessage for in-session chat.
type ChatMessage struct {
	Sender    string `json:"sender"`
	Text      string `json:"text"`
	Timestamp int64  `json:"timestamp"`
}

// ClipboardMessage for clipboard synchronization.
type ClipboardMessage struct {
	Format string `json:"format"` // "text", "html", "image"
	Data   []byte `json:"-"`
}

// CursorPosition for cursor sync.
type CursorPosition struct {
	X       int32 `json:"x"`
	Y       int32 `json:"y"`
	Display int   `json:"display"`
}

// --- Helper functions ---

// MarshalPayload encodes a message payload to JSON bytes.
func MarshalPayload(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

// UnmarshalPayload decodes a JSON payload into the target struct.
func UnmarshalPayload(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}

// NewVideoFrame creates a new video frame message.
func NewVideoFrame(display int, width, height int, format string, quality int, data []byte) *VideoFrame {
	return &VideoFrame{
		DisplayIndex: display,
		FrameNum:     0, // Set by sender
		Timestamp:    time.Now().UnixMilli(),
		Width:        width,
		Height:       height,
		Format:       format,
		Quality:      quality,
		Data:         data,
	}
}

// String returns a human-readable representation of message type.
func (mt MessageType) String() string {
	names := map[MessageType]string{
		MsgHello: "Hello", MsgHelloAck: "HelloAck",
		MsgAuth: "Auth", MsgAuthResult: "AuthResult",
		MsgSessionInfo: "SessionInfo", MsgPing: "Ping", MsgPong: "Pong",
		MsgDisconnect: "Disconnect",
		MsgVideoFrame: "VideoFrame", MsgCursorPos: "CursorPos",
		MsgCursorShape: "CursorShape", MsgResolution: "Resolution",
		MsgMouseEvent: "MouseEvent", MsgKeyboardEvent: "KeyboardEvent",
		MsgTouchEvent: "TouchEvent",
		MsgFileRequest: "FileRequest", MsgFileData: "FileData",
		MsgFileAck: "FileAck", MsgFileComplete: "FileComplete",
		MsgDirList: "DirList", MsgDirListResult: "DirListResult",
		MsgClipboard: "Clipboard", MsgChat: "Chat",
	}
	if name, ok := names[mt]; ok {
		return name
	}
	return fmt.Sprintf("Unknown(%d)", mt)
}
