package logseal

import (
	"encoding/json"
	"fmt"
)

// Error is returned when the LogSeal API responds with an error.
type Error struct {
	Type       string `json:"type"`
	Code       string `json:"code"`
	Message    string `json:"message"`
	Param      string `json:"param,omitempty"`
	DocURL     string `json:"doc_url,omitempty"`
	StatusCode int    `json:"-"`
}

func (e *Error) Error() string {
	return fmt.Sprintf("logseal: [%s] %s: %s", e.Type, e.Code, e.Message)
}

func parseError(body []byte, statusCode int) error {
	var wrapper struct {
		Err Error `json:"error"`
	}
	if err := json.Unmarshal(body, &wrapper); err != nil {
		return &Error{
			Type:       "internal_error",
			Code:       "unknown",
			Message:    string(body),
			StatusCode: statusCode,
		}
	}
	wrapper.Err.StatusCode = statusCode
	return &wrapper.Err
}
