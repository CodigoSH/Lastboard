package user

import "time"

type User struct {
	ID          int       `json:"id"`
	Username    string    `json:"username"`
	Password    string    `json:"-"`
	Role        string    `json:"role"`
	AccentColor string    `json:"accent_color"`
	Language    string    `json:"language"`
	CreatedAt   time.Time `json:"created_at"`
}

type Repository interface {
	Create(u *User) error
	GetByUsername(username string) (*User, error)
	Count() (int, error)
}
