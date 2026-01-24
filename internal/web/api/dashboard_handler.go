package api

import (
	"encoding/json"
	"net/http"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

func (h *DashboardHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	// Mock Dashboard Data
	data := map[string]interface{}{
		"stats": map[string]int{
			"total_items":  12,
			"active_users": 1,
		},
		"widgets": []string{"chart", "status"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
