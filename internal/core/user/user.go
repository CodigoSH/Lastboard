package user

import "time"

type User struct {
	ID          int    `json:"id"`
	Username    string `json:"username"`
	Password    string `json:"-"`
	Role        string `json:"role"`
	AccentColor string `json:"accent_color"`
	Language    string `json:"language"`
	Theme       string `json:"theme"`
	// Grid Preferences
	WidgetMinWidth int `json:"widget_min_width"`
	// Deprecated: GridColumns* fields are replaced by auto-fill grid
	// GridColumnsPC     int       `json:"grid_columns_pc"`
	// GridColumnsTablet int       `json:"grid_columns_tablet"`
	// GridColumnsMobile int       `json:"grid_columns_mobile"`
	ProjectName string    `json:"project_name"`
	AvatarUrl   string    `json:"avatar_url"`
	BetaUpdates bool      `json:"beta_updates"`
	CreatedAt   time.Time `json:"created_at"`
}

type Repository interface {
	Create(u *User) error
	GetByUsername(username string) (*User, error)
	Count() (int, error)
}
