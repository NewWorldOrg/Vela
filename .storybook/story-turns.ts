export class StoryTurns {
  #playing: string | null = null

  begin(id: string): boolean {
    const leftRunning = this.#playing !== null && this.#playing !== id

    this.#playing = id

    return leftRunning
  }

  end(id: string): boolean {
    if (this.#playing !== id) {
      return false
    }

    this.#playing = null

    return true
  }
}
