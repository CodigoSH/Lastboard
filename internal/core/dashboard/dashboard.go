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
	Url       string    `json:"url,omitempty"` // Added for widget compatibility
	Content   string    `json:"content,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Repository interface {
	Create(item *Item) error
	GetAll() ([]Item, error)
}
