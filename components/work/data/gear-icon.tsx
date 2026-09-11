import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear } from '@fortawesome/free-solid-svg-icons'

/**
 * The indicator for every radio button and checkbox in /work, standing in
 * for the native control.
 *
 * Purely decorative (`aria-hidden`) — it renders right after the `<input>`
 * inside the same `<label>`. The input itself stays in the DOM, still the
 * thing that's keyboard-focusable and that the label actually toggles; only
 * its own box is hidden by CSS (`label.checkbox input`, `label.radio input`
 * in work.css), which also drives this icon's color/rotation off the
 * input's `:checked` and `:focus-visible` state.
 */
export function GearIcon() {
  return <FontAwesomeIcon icon={faGear} className="gear-icon" aria-hidden="true" />
}
