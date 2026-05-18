//go:build !linux

package power

// Inhibit は Linux 以外では何もしない。
func Inhibit() (func(), error) {
	return func() {}, nil
}
