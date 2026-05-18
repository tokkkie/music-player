//go:build linux

package power

import (
	"fmt"
	"os"

	"github.com/godbus/dbus/v5"
)

// Inhibit はシステムのスリープと画面消灯を抑制する。
// 戻り値の cancel 関数を呼ぶと抑制を解除する。
func Inhibit() (func(), error) {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to system bus: %w", err)
	}
	defer conn.Close()

	obj := conn.Object("org.freedesktop.login1", "/org/freedesktop/login1")
	var fd dbus.UnixFD
	err = obj.Call(
		"org.freedesktop.login1.Manager.Inhibit",
		0,
		"idle;sleep",
		"music-player",
		"Playing music",
		"block",
	).Store(&fd)
	if err != nil {
		return nil, fmt.Errorf("failed to inhibit: %w", err)
	}

	file := os.NewFile(uintptr(fd), "inhibit-fd")
	return func() {
		if file != nil {
			file.Close()
		}
	}, nil
}
