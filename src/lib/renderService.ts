/**
 * Cliente API para el Servicio Web en Render
 * 
 * Este módulo se encarga de las comunicaciones con la API alojada en Render.
 */

// Preferiremos la variable de entorno, si no existe usamos un placeholder.
export const renderApiUrl = import.meta.env.VITE_RENDER_API_URL || 'https://tu-servicio-en-render.onrender.com';

/**
 * Ejemplo de función para enviar datos al web service.
 * @param endpoint El endpoint en el servidor de Render (ej. '/api/process')
 * @param data Los datos a enviar
 */
export const postToRenderService = async (endpoint: string, data: any) => {
  try {
    const response = await fetch(`${renderApiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}` // Si usas JWT
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error contacting Render service:', error);
    throw error;
  }
};

/**
 * Ejemplo de función para obtener datos del web service.
 * @param endpoint El endpoint (ej. '/api/status')
 */
export const getFromRenderService = async (endpoint: string) => {
  try {
    const response = await fetch(`${renderApiUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching from Render service:', error);
    throw error;
  }
};
