# Telemetry Widget

The Telemetry widget shows how hard the machine running Lastboard is working right now. It is listed as **Server Health** in the widget picker.

## Description

Up to three ring gauges — CPU, RAM and temperature — for the server Lastboard itself is installed on. No agent, no exporter and no configuration: the readings come from the server you are already running.

![Telemetry Widget](../assets/w-telemetry.png)

## Metrics Displayed

| Metric | Meaning |
| :--- | :--- |
| **CPU** | Processor use, as a percentage. |
| **RAM** | Memory in use, as a percentage of the total. |
| **TEMP** | The server's temperature reading. |

Each ring is green while the value is comfortable, amber as it climbs and red when it is high: above **60%** and **80%** for CPU and RAM, above **50 °C** and **70 °C** for temperature. Those two temperatures are the thresholds whichever unit you display.

## Configuration Options

| Option | Default | Description |
| :--- | :--- | :--- |
| **Metrics** | All three | Which of CPU, RAM and TEMP the widget draws. At least one has to stay on — the last one you try to switch off comes back. |
| **Refresh Rate** | 5s | How often the widget redraws: **5s, 10s, 30s or 1m**. A widget saved earlier with 1s or 2s now runs at 5s. |

The **Personalize** tab adds a border color and a border width (Thin, Regular or Thick) for the widget's card.

**Saving the metrics resizes the widget.** One metric takes one cell, two take two, three take three — so the gauges keep their proportions instead of stretching. The widget has no resize handle of its own in Edit Mode; this is how its width is set.

## Notes

- The server measures once a second and pushes the readings to every open Lastboard tab. It skips the measurement entirely when nobody has Lastboard open. The **Refresh Rate** setting decides how often the widget redraws with what arrives.
- Nothing is recorded. This widget is the present moment only — for a history of your services over time, see [Monitoring & Uptime](../monitoring/overview.md).
- Readings are read from the Linux kernel. On a server that is not running Linux there is nothing to read: CPU and RAM sit at 0%.
- Temperature needs a thermal sensor the server can read. Where there is none — which includes many virtual machines — the gauge shows **-1** instead of a reading.
- The temperature unit follows **Measurement Units** in your preferences: °C or °F.
