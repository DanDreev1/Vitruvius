export function generateRoomCode(): string {
  const randomNumber = Math.floor(Math.random() * 1_000_000);
  return randomNumber.toString().padStart(6, '0');
}