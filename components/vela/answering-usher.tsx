'use client'

import { useState, type PointerEvent } from 'react'

import { Usher, type UsherMood } from '@/components/vela/marks'

const ANSWER = 'usher-answer'

function answerAgain(node: HTMLElement): void {
  if (typeof node.getAnimations !== 'function') {
    return
  }

  for (const running of node.getAnimations({ subtree: true })) {
    if (
      running instanceof CSSAnimation &&
      running.animationName.startsWith(ANSWER)
    ) {
      running.currentTime = 0
      running.play()
    }
  }
}

/**
 * The usher of an empty state: it arrives once, and hops again each time a
 * pointer comes onto it or a finger touches it.
 */
export function AnsweringUsher({
  mood,
  className,
}: {
  mood: UsherMood
  className?: string
}) {
  const [answering, setAnswering] = useState<boolean>(false)

  const answer = (event: PointerEvent<HTMLSpanElement>): void => {
    if (!answering) {
      setAnswering(true)
      return
    }

    answerAgain(event.currentTarget)
  }

  return (
    <span
      data-slot="answering-usher"
      data-answering={answering ? '' : undefined}
      onPointerEnter={answer}
      onPointerDown={answer}
      className="inline-flex"
    >
      <Usher mood={mood} className={className} />
    </span>
  )
}
