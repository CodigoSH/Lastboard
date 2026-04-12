package dashboard

import "time"

type Item struct {
	ID        int       `json:"id"`
	ParentID  *int      `json:"parent_id"`
	Type      string    `json:"type"` // e.g., "container", "widget"
	X         int       `json:"x"`
	Y         int       `json:"y"`
	W         int       `json:"w"`
	H         int       `json:"h"`
	Url         string    `json:"url,omitempty"` // Added for widget compatibility
	Content     string    `json:"content,omitempty"`
	DashboardID *int      `json:"dashboard_id,omitempty"`
	MobileOrder *int      `json:"mobile_order,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type Dashboard struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Position  int       `json:"position"`
	IsDefault bool      `json:"is_default"`
	CreatedAt time.Time `json:"created_at"`
}

