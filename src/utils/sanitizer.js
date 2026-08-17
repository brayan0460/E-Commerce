// src/utils/sanitizer.js
export function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML; // O usar una librería ligera como DOMPurify si manejas HTML enriquecido
}