# SENTINEL-AI: Embedded & Edge Deployment Guide
**Smart India Hackathon SIH26052 | Defence Research and Development Organisation (DRDO)**
*Intelligent Audio. Clear Communication. Reliable Defence.*

---

## 1. Target Hardware Specifications

| Component | Specification | Description |
| :--- | :--- | :--- |
| **Edge Compute** | Raspberry Pi 4 Model B (4GB / 8GB) or Raspberry Pi 5 | Broadcom BCM2711 / BCM2712 Quad-Core Cortex-A72 / A76 |
| **Operating System** | Raspberry Pi OS 64-bit (Debian Bookworm) Lite | Headless minimal installation for minimum background jitter |
| **Primary Microphone** | USB Audio Class 2.0 or I2S MEMS (INMP441 / SPH0645) | 16-bit PCM, 16 kHz sampling, SNR > 64 dB |
| **Optional Reference Mic** | I2S Secondary MEMS or External Ambient Mic | Mounted on helmet/vehicle exterior for dual-channel NLMS |
| **Audio Output** | 3.5mm Analog Audio Jack or USB Tactical Headset | Low-latency ALSA direct output buffer |
| **Power Budget** | 5V @ 1.8A (~9 Watts peak) | Compatible with military standard tactical battery packs |

---

## 2. Hardware Wiring (I2S MEMS Microphone)

For direct digital MEMS microphones connected to the 40-pin GPIO header:

| INMP441 Pin | Raspberry Pi Pin | Function |
| :--- | :--- | :--- |
| **VDD** | Pin 1 (3.3V) | Power supply |
| **GND** | Pin 9 (GND) | Ground |
| **SD** | Pin 38 (GPIO 20) | Serial Data (DOUT) |
| **WS** | Pin 35 (GPIO 19) | Word Select (LRCLK / Frame Clock) |
| **SCK** | Pin 12 (GPIO 18) | Serial Clock (BCLK) |
| **L/R** | Pin 9 (GND) | Channel select (GND = Left, 3.3V = Right) |

Enable I2S in `/boot/firmware/config.txt`:
```ini
dtparam=i2s=on
dtoverlay=googlevoicehat-soundcard
```

---

## 3. ALSA Direct Configuration (`/etc/asound.conf`)

Configure ALSA for sub-10ms direct hardware streaming:
```ini
pcm.!default {
    type asym
    playback.pcm "hw:0,0"
    capture.pcm "hw:1,0"
}

ctl.!default {
    type hw
    card 0
}
```

---

## 4. Edge Runtime Installation

```bash
# 1. Update OS packages
sudo apt-get update && sudo apt-get install -y python3-pip libsndfile1 portaudio19-dev

# 2. Clone repository & install runtime
git clone https://github.com/drdo-sih/sentinel-ai.git /opt/sentinel-ai
cd /opt/sentinel-ai
pip3 install --no-cache-dir onnxruntime numpy scipy soundfile sounddevice

# 3. Verify Edge CPU Benchmark
python3 backend/sentinel_edge.py --benchmark-only
```

Expected output on Raspberry Pi 4 (Cortex-A72 @ 1.5 GHz):
```
[+] Average 10ms Frame Latency: 0.72 ms
[+] Real-Time Factor (RTF): 0.072 (13.8x faster than real-time)
[+] Feasibility: FULLY_COMPLIANT_WITH_RPi4
[+] Model Flash Footprint: 1.50 MB
[+] Estimated RAM: 28.5 MB
```

---

## 5. Systemd Daemon Service Configuration

To run SENTINEL-AI automatically upon vehicular or tactical radio bootup:

Create `/etc/systemd/system/sentinel-ai.service`:
```ini
[Unit]
Description=SENTINEL-AI Defence Speech Enhancement Daemon
After=network.target sound.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/sentinel-ai
ExecStart=/usr/bin/python3 /opt/sentinel-ai/backend/main.py
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sentinel-ai.service
sudo systemctl start sentinel-ai.service
sudo systemctl status sentinel-ai.service
```

---

## 6. Communication Speech Enhancement vs. Physical Active Noise Cancellation

It is critical to distinguish communication-channel enhancement from acoustic ANC:
1. **Communication Channel Enhancement (SENTINEL-AI):** Operates on the transmitted/received digital audio stream before radio transmission or headset amplification. Filters stationary, rotor, and impulsive threats directly from the speech signal.
2. **Physical Acoustic ANC:** Requires acoustic anti-sound loudspeakers generating physical destructive wave interference inside the ear canal ($180^\circ$ acoustic phase inversion). Single-microphone digital systems cannot cancel physical sound waves in air; SENTINEL-AI clarifies the tactical audio transmitted to squad members and headquarters.
