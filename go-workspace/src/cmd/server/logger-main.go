package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type LogEntry struct {
	UserID       string      `json:"user_id"`
	CommandType  string      `json:"command_type"`
	CommandData  interface{} `json:"command_data"`
	TargetIP     string      `json:"target_ip"`
	TargetPort   int         `json:"target_port"`
	HexData      string      `json:"hex_data"`
	Status       string      `json:"status"`
	ErrorMessage string      `json:"error_message,omitempty"`
	Timestamp    time.Time   `json:"timestamp"`
	RemoteAddr   string      `json:"remote_addr"`
}

type apiResp struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, apiResp{Status: "ok"})
	})

	// 接收前端日志
	mux.HandleFunc("/api/log", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, apiResp{Status: "error", Message: "method not allowed"})
			return
		}

		var entry LogEntry
		if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
			log.Printf("日志解析错误: %v", err)
			writeJSON(w, http.StatusBadRequest, apiResp{Status: "error", Message: "invalid json"})
			return
		}

		// 补充时间戳和来源IP
		entry.Timestamp = time.Now()
		entry.RemoteAddr = r.RemoteAddr

		// 详细日志输出
		log.Printf("=== 机器人控制日志 ===")
		log.Printf("用户ID: %s", entry.UserID)
		log.Printf("命令类型: %s", entry.CommandType)
		log.Printf("命令数据: %+v", entry.CommandData)
		log.Printf("目标机器人: %s:%d", entry.TargetIP, entry.TargetPort)
		log.Printf("十六进制数据: %s", entry.HexData)
		log.Printf("状态: %s", entry.Status)
		if entry.ErrorMessage != "" {
			log.Printf("错误信息: %s", entry.ErrorMessage)
		}
		log.Printf("时间戳: %s", entry.Timestamp.Format("2006-01-02 15:04:05"))
		log.Printf("来源IP: %s", entry.RemoteAddr)
		log.Printf("========================")

		writeJSON(w, http.StatusOK, apiResp{Status: "ok", Message: "log recorded"})
	})

	// 根路径
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, apiResp{Status: "ok", Message: "机器人日志服务器运行中"})
	})

	handler := withCORS(withLogging(mux))
	log.Printf("机器人日志服务器启动，端口: %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

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

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &loggingResponseWriter{ResponseWriter: w, status: 200}
		
		log.Printf("[HTTP] %s %s from %s", r.Method, r.URL.String(), r.RemoteAddr)
		
		next.ServeHTTP(lrw, r)
		
		log.Printf("[HTTP] %d %dB in %v", lrw.status, lrw.size, time.Since(start))
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