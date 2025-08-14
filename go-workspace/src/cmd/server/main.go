package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)


type apiResp struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

type commandReq struct {
	Command string `json:"command"`
}

// TCP bridge manager and request types
 type robotConnManager struct {
     mu       sync.Mutex
     conn     net.Conn
     listener net.Listener
 }
 
 var robot robotConnManager
 
 func (m *robotConnManager) SetConn(c net.Conn) {
     m.mu.Lock()
     defer m.mu.Unlock()
     if m.conn != nil && m.conn != c {
         _ = m.conn.Close()
     }
     m.conn = c
 }
 
 func (m *robotConnManager) GetConn() net.Conn {
     m.mu.Lock()
     defer m.mu.Unlock()
     return m.conn
 }
 
 func (m *robotConnManager) CloseConn() {
     m.mu.Lock()
     defer m.mu.Unlock()
     if m.conn != nil {
         _ = m.conn.Close()
         m.conn = nil
     }
 }
 
 func (m *robotConnManager) CloseListener() {
     m.mu.Lock()
     defer m.mu.Unlock()
     if m.listener != nil {
         _ = m.listener.Close()
         m.listener = nil
     }
 }
 
 type connectReq struct {
     Addr string `json:"addr"` // e.g. "192.168.0.10:8080"
 }
 
 type listenReq struct {
     Port int `json:"port"`
 }
 
 type rawReq struct {
     Data []int `json:"data"` // 0..255
 }
 
 func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, apiResp{Status: "ok"})
	})

	// Simple ping endpoint
	mux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, apiResp{Status: "ok", Message: "pong"})
	})

	// Robot command endpoint (example)
	mux.HandleFunc("/api/robot/command", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, apiResp{Status: "error", Message: "method not allowed"})
			return
		}
		var req commandReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, apiResp{Status: "error", Message: "invalid json"})
			return
		}
		log.Printf("Robot command received from %s: %q", r.RemoteAddr, req.Command)
		writeJSON(w, http.StatusOK, apiResp{Status: "ok", Message: "command accepted"})
	})

	// TCP: actively connect to robot (client mode)
	mux.HandleFunc("/api/robot/connect", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, apiResp{Status: "error", Message: "method not allowed"})
			return
		}
		var req connectReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Addr == "" {
			writeJSON(w, http.StatusBadRequest, apiResp{Status: "error", Message: "invalid addr"})
			return
		}
		log.Printf("HTTP %s requested TCP connect to %s", r.RemoteAddr, req.Addr)
		conn, err := net.DialTimeout("tcp", req.Addr, 3*time.Second)
		if err != nil {
			log.Printf("TCP connect error: %v", err)
			writeJSON(w, http.StatusBadGateway, apiResp{Status: "error", Message: err.Error()})
			return
		}
		robot.SetConn(conn)
		go func(c net.Conn) {
			log.Printf("Robot TCP connected: local=%s remote=%s", c.LocalAddr(), c.RemoteAddr())
			reader := bufio.NewReader(c)
			for {
				buf := make([]byte, 4096)
				n, err := reader.Read(buf)
				if err != nil {
					log.Printf("Robot TCP read closed: %v", err)
					robot.CloseConn()
					return
				}
				log.Printf("Robot TCP -> %d bytes: % X", n, buf[:n])
			}
		}(conn)
		writeJSON(w, http.StatusOK, apiResp{Status: "ok", Message: "connected"})
	})

	// TCP: disconnect active connection
	mux.HandleFunc("/api/robot/disconnect", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, apiResp{Status: "error", Message: "method not allowed"})
			return
		}
		robot.CloseConn()
		writeJSON(w, http.StatusOK, apiResp{Status: "ok", Message: "disconnected"})
	})

	// TCP: start listening for robot connection (server mode)
	mux.HandleFunc("/api/robot/listen", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, apiResp{Status: "error", Message: "method not allowed"})
			return
		}
		var req listenReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Port <= 0 || req.Port > 65535 {
			writeJSON(w, http.StatusBadRequest, apiResp{Status: "error", Message: "invalid port"})
			return
		}
		log.Printf("HTTP %s requested TCP server listen on :%d", r.RemoteAddr, req.Port)
		robot.CloseListener()
		ln, err := net.Listen("tcp", ":"+strconv.Itoa(req.Port))
		if err != nil {
			log.Printf("TCP listen error: %v", err)
			writeJSON(w, http.StatusBadGateway, apiResp{Status: "error", Message: err.Error()})
			return
		}
		robot.mu.Lock()
		robot.listener = ln
		robot.mu.Unlock()
		go func() {
			log.Printf("TCP server listening on :%d", req.Port)
			for {
				c, err := ln.Accept()
				if err != nil {
					log.Printf("TCP accept closed: %v", err)
					return
				}
				log.Printf("Robot connected from %s", c.RemoteAddr())
				robot.SetConn(c)
				go func(conn net.Conn) {
					reader := bufio.NewReader(conn)
					for {
						buf := make([]byte, 4096)
						n, err := reader.Read(buf)
						if err != nil {
							log.Printf("Robot TCP read closed: %v", err)
							robot.CloseConn()
							return
						}
						log.Printf("Robot TCP -> %d bytes: % X", n, buf[:n])
					}
				}(c)
			}
		}()
		writeJSON(w, http.StatusOK, apiResp{Status: "ok", Message: "listening"})
	})

	// TCP: stop listening
	mux.HandleFunc("/api/robot/stop-listen", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, apiResp{Status: "error", Message: "method not allowed"})
			return
		}
		robot.CloseListener()
		writeJSON(w, http.StatusOK, apiResp{Status: "ok", Message: "listener stopped"})
	})

	// TCP: send raw bytes to robot
	mux.HandleFunc("/api/robot/send-raw", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, apiResp{Status: "error", Message: "method not allowed"})
			return
		}
		var req rawReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Data) == 0 {
			writeJSON(w, http.StatusBadRequest, apiResp{Status: "error", Message: "invalid data"})
			return
		}
		conn := robot.GetConn()
		if conn == nil {
			writeJSON(w, http.StatusBadRequest, apiResp{Status: "error", Message: "no robot connection"})
			return
		}
		buf := make([]byte, len(req.Data))
		for i, v := range req.Data {
			if v < 0 || v > 255 {
				writeJSON(w, http.StatusBadRequest, apiResp{Status: "error", Message: "byte out of range"})
				return
			}
			buf[i] = byte(v)
		}
		log.Printf("HTTP %s send-raw %d bytes: % X", r.RemoteAddr, len(buf), buf)
		_ = conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
		n, err := conn.Write(buf)
		if err != nil {
			log.Printf("TCP write error: %v", err)
			writeJSON(w, http.StatusBadGateway, apiResp{Status: "error", Message: err.Error()})
			return
		}
		log.Printf("Sent to robot %d bytes: % X", n, buf[:n])
		writeJSON(w, http.StatusOK, apiResp{Status: "ok", Message: fmt.Sprintf("sent %d bytes", n)})
	})

	// TCP: status endpoint
	mux.HandleFunc("/api/robot/status", func(w http.ResponseWriter, r *http.Request) {
		type status struct {
			Connected bool   `json:"connected"`
			Listening bool   `json:"listening"`
			Remote    string `json:"remote,omitempty"`
			Local     string `json:"local,omitempty"`
		}
		robot.mu.Lock()
		st := status{
			Connected: robot.conn != nil,
			Listening: robot.listener != nil,
		}
		if robot.conn != nil {
			st.Remote = robot.conn.RemoteAddr().String()
			st.Local = robot.conn.LocalAddr().String()
		}
		robot.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(st)
	})

	handler := withCORS(withLogging(mux))
	log.Printf("Go server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

// CORS middleware (currently permissive for development)
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Logging middleware: logs method, path, remote addr, small body preview, status, duration
func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Generate a simple request ID
		reqID := fmt.Sprintf("%d", time.Now().UnixNano())
		// Read and restore body for downstream handlers
		var bodyPreview string
		if r.Body != nil {
			b, _ := io.ReadAll(r.Body)
			// Restore
			r.Body = io.NopCloser(bytes.NewBuffer(b))
			const max = 2048
			if len(b) > max {
				bodyPreview = fmt.Sprintf("%s...(truncated %d bytes)", string(b[:max]), len(b)-max)
			} else {
				bodyPreview = string(b)
			}
		}
		log.Printf("[REQ %s] %s %s from %s | CT=%s | Body=%q",
			reqID, r.Method, r.URL.String(), r.RemoteAddr, r.Header.Get("Content-Type"), bodyPreview)

		lrw := &loggingResponseWriter{ResponseWriter: w, status: 200}
		start := time.Now()
		next.ServeHTTP(lrw, r)
		dur := time.Since(start)

		log.Printf("[RES %s] %d %dB in %v", reqID, lrw.status, lrw.size, dur)
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	status int
	size   int
}

func (l *loggingResponseWriter) WriteHeader(statusCode int) {
	l.status = statusCode
	l.ResponseWriter.WriteHeader(statusCode)
}

func (l *loggingResponseWriter) Write(b []byte) (int, error) {
	n, err := l.ResponseWriter.Write(b)
	l.size += n
	return n, err
}