// components/booking/SlotCardPublic.jsx

import { Button } from 'antd';

/**
 * SlotCardPublic - Simplified slot card for public booking
 *
 * Displays a single time slot as a clickable button.
 * Shows only the start time, styled as available.
 *
 * Props:
 * - time: string - Formatted time (e.g., "08:00")
 * - onClick: () => void - Called when slot is clicked
 * - selected: boolean - Whether this slot is selected (optional)
 *
 * Usage:
 * <SlotCardPublic
 *   time="08:00"
 *   onClick={() => console.log('Clicked')}
 *   selected={false}
 * />
 */
export default function SlotCardPublic({ time, onClick, selected = false }) {
  return (
    <Button
      size="small"
      block
      type={selected ? 'primary' : 'default'}
      onClick={onClick}
      style={{
        height: 36,
        fontSize: 13,
        fontWeight: selected ? 'bold' : 'normal',
      }}
    >
      {time}
    </Button>
  );
}
