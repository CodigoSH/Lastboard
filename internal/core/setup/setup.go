package setup

// InitData defines the structure for initial setup payload
type InitData struct {
	AdminUsername string `json:"admin_username"`
	AdminPassword string `json:"admin_password"`
}

// Service defines operations for setup
type Service interface {
	InitializeSystem(data InitData) error
}
