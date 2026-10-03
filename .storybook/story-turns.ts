/** Which story the runner is in the middle of, so that one still running after its time ran out is kept away from the next. */
export class StoryTurns {
  #playing: string | null = null

  /** Starts a story, and says whether the one before it was left running. */
  begin(id: string): boolean {
    const leftRunning = this.#playing !== null && this.#playing !== id

    this.#playing = id

    return leftRunning
  }

  /** Ends a story, and says whether it is still the one being run. */
  end(id: string): boolean {
    if (this.#playing !== id) {
      return false
    }

    this.#playing = null

    return true
  }
}
