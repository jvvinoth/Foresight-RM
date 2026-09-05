import { useEffect, useState, type ReactNode } from 'react'
import { Monitor, RotateCcw, Tablet } from 'lucide-react'

/** iPad Pro 11" logical resolution. */
const W = 834
const H = 1194
const BEZEL = 20
const KEY = 'foresight.device'

export type Device = 'desktop' | 'ipad-portrait' | 'ipad-landscape'

export function useDevice() {
  const [device, setDevice] = useState<Device>(
    () => (localStorage.getItem(KEY) as Device) || 'desktop',
  )
  useEffect(() => {
    localStorage.setItem(KEY, device)
  }, [device])
  return { device, setDevice }
}

export function DeviceToggle({
  device,
  setDevice,
}: {
  device: Device
  setDevice: (d: Device) => void
}) {
  const onTablet = device !== 'desktop'
  return (
    <div className="flex items-center gap-px overflow-hidden rounded border border-white/15">
      <button
        onClick={() => setDevice('desktop')}
        title="Desktop view"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors ${
          device === 'desktop' ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
        }`}
      >
        <Monitor size={13} strokeWidth={1.9} />
        <span className="hidden lg:inline">Desktop</span>
      </button>
      <button
        onClick={() => setDevice('ipad-landscape')}
        title="iPad view — how the RM actually uses it"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors ${
          onTablet ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
        }`}
      >
        <Tablet size={13} strokeWidth={1.9} />
        <span className="hidden lg:inline">iPad</span>
      </button>
      {onTablet && (
        <button
          onClick={() =>
            setDevice(device === 'ipad-portrait' ? 'ipad-landscape' : 'ipad-portrait')
          }
          title="Rotate"
          className="px-2.5 py-1.5 text-white/55 transition-colors hover:text-white"
        >
          <RotateCcw size={13} strokeWidth={1.9} />
        </button>
      )}
    </div>
  )
}

/**
 * Renders the app inside an iPad bezel, scaled to fit the window.
 *
 * The frame is a real viewport, not a picture of one — the app inside gets
 * 834x1194 CSS pixels and its own scroll container, so responsive breakpoints
 * resolve exactly as they would on the device.
 */
export function DeviceFrame({ device, children }: { device: Device; children: ReactNode }) {
  const landscape = device === 'ipad-landscape'
  const w = landscape ? H : W
  const h = landscape ? W : H
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const fit = () => {
      const pad = 56
      setScale(
        Math.min(
          1,
          (window.innerHeight - pad) / (h + BEZEL * 2),
          (window.innerWidth - pad) / (w + BEZEL * 2),
        ),
      )
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [w, h])

  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-auto bg-jb-950 p-6">
      <div
        style={{
          width: (w + BEZEL * 2) * scale,
          height: (h + BEZEL * 2) * scale,
        }}
      >
        <div
          style={{
            width: w + BEZEL * 2,
            height: h + BEZEL * 2,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="relative rounded-[34px] bg-[#1c1c1e] p-[20px] shadow-[0_0_0_2px_#3a3a3c,0_28px_70px_-14px_rgba(0,0,0,0.85)]"
        >
          {/* camera */}
          <div
            className="absolute rounded-full bg-[#2c2c2e] ring-1 ring-black/40"
            style={
              landscape
                ? { left: 8, top: '50%', marginTop: -3, width: 6, height: 6 }
                : { top: 8, left: '50%', marginLeft: -3, width: 6, height: 6 }
            }
          />

          {/* screen */}
          <div
            style={{ width: w, height: h }}
            className="thin-scroll overflow-y-auto overflow-x-hidden rounded-[16px] bg-iron-100"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
