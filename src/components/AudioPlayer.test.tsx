import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAudio } from '../api/banidb'
import { useLocaleStore } from '../store/locale'
import { useRecitationStore } from '../store/recitation'
import AudioPlayer from './AudioPlayer'

vi.mock('../api/banidb', () => ({
  fetchAudio: vi.fn(),
}))

describe('AudioPlayer', () => {
  beforeEach(() => {
    vi.mocked(fetchAudio).mockReset()
    useLocaleStore.setState({ locale: 'en' })
    useRecitationStore.setState({
      currentShabadId: null,
      currentTime: 0,
      playbackRate: 1,
      playing: false,
    })
  })

  it('loads BaniDB recitation and supports play, scrub, skip, and speed', async () => {
    vi.mocked(fetchAudio).mockResolvedValue('https://audio.example/recitation.mp3')
    render(<AudioPlayer shabadId={42} />)

    expect(screen.getByText('Finding recitation…')).toBeInTheDocument()
    const audio = await screen.findByTestId('gurbani-recitation-audio')
    Object.defineProperty(audio, 'duration', { configurable: true, value: 120 })
    fireEvent.loadedMetadata(audio)

    expect(fetchAudio).toHaveBeenCalledWith(42)
    expect(screen.getByText(/Ambient soundscapes are controlled separately/i)).toBeInTheDocument()
    expect(audio).toHaveAttribute('preload', 'none')
    expect(useRecitationStore.getState().currentShabadId).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Play recitation' }))
    await waitFor(() => expect(useRecitationStore.getState().playing).toBe(true))
    expect(useRecitationStore.getState().currentShabadId).toBe(42)
    expect(screen.getByRole('button', { name: 'Pause recitation' })).toBeInTheDocument()

    audio.currentTime = 30
    fireEvent.timeUpdate(audio)
    fireEvent.click(screen.getByRole('button', { name: 'Go forward 15 seconds' }))
    expect(audio.currentTime).toBe(45)
    expect(useRecitationStore.getState().currentTime).toBe(45)

    fireEvent.change(screen.getByLabelText('Recitation position'), { target: { value: '75' } })
    expect(audio.currentTime).toBe(75)

    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '1.5' } })
    expect(audio.playbackRate).toBe(1.5)
    expect(useRecitationStore.getState().playbackRate).toBe(1.5)
  })

  it('shows a quiet unavailable state when a shabad has no recording', async () => {
    vi.mocked(fetchAudio).mockResolvedValue(null)
    render(<AudioPlayer shabadId={7} />)

    expect(await screen.findByText('Recitation is not available for this shabad yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play recitation' })).not.toBeInTheDocument()
  })
})
