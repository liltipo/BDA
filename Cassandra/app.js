const inquirer = require('inquirer');
const { createKeyspace, createTable } = require('./db/setup');
const { addStamp, searchStamps, addTimeValue, updateTimeValue } = require('./services/stampService');

async function mainMenu() {
    const answer = await inquirer.prompt({
      name: 'action',
      type: 'list',
      message: '¿Qué deseas hacer?',
      choices: ['Agregar estampilla', 'Buscar estampillas', 'Agregar time value', 'Modificar time value', 'Salir'],
    });

  if (answer.action === 'Agregar estampilla') {
    const answers = await inquirer.prompt([
      { name: 'title', message: 'Título de la estampilla:' },
      { name: 'country', message: 'País de emisión:' },
      { name: 'year', message: 'Año de emisión:', type: 'number' },
      { name: 'serie', message: 'Serie de la estampilla:' },
      { name: 'design', message: 'Descripción del diseño:' },
      { name: 'face_value', message: 'Valor nominal (float):', type: 'number' },
      { name: 'condition', message: 'Condición (nuevo, usado, dañado):' },
      { name: 'status', message: 'Estado (disponible, vendido, reservado):' },
      { name: 'seller', message: 'Vendedor:' },
      { name: 'tags', message: 'Tags (separados por comas):' }
    ]);
  
    // Procesar los tags como un set
    answers.tags = answers.tags ? answers.tags.split(',').map(tag => tag.trim()) : [];
  
    await addStamp(answers);
    console.log('Estampilla agregada.');
    await mainMenu(); // Llama al menú nuevamente
  }
  

  if (answer.action === 'Buscar estampillas') {
    const searchParams = await inquirer.prompt([
      { name: 'year', message: 'Año de emisión (obligatorio):', type: 'number' },
      { name: 'country', message: 'País de emisión (obligatorio):' },
      { name: 'tags', message: 'Tags (opcional, separa hasta 3 tags por coma):', default: '' },
      { name: 'condition', message: 'Condición (opcional):', default: '' }
    ]);
  
    const tags = searchParams.tags ? searchParams.tags.split(',').map(tag => tag.trim()) : [];
    const condition = searchParams.condition || null;
  
    const results = await searchStamps(searchParams.year, searchParams.country, tags, condition);
    
    // Convertir stamp_id a cadena y formatear time_value
    results.forEach(result => {
      result.stamp_id = result.stamp_id.toString();
      
      // Si existe time_value, formatearlo
      if (result.time_value) {
        const formattedTimeValue = {};
        
        // Formatear cada clave y valor de time_value
        Object.entries(result.time_value).forEach(([date, value]) => {
          // Formatear la fecha
          const formattedDate = new Date(date).toDateString().slice(4);  // Ejemplo: "Dec 15 2020"
          
          // Redondear el valor a 2 decimales
          const formattedValue = value.toFixed(2);
          
          formattedTimeValue[formattedDate] = formattedValue;
        });
        
        result.time_value = formattedTimeValue;
      }
    });
    
    console.log('Resultados de la búsqueda:');
    console.table(results);
    await mainMenu(); // Vuelve al menú principal
  }  

  if (answer.action === 'Agregar time value') {
    const answers = await inquirer.prompt([
      { name: 'stampId', message: 'ID de la estampilla:' },
      { name: 'date', message: 'Fecha (YYYY-MM-DD):' },
      { name: 'value', message: 'Valor (float):', type: 'number' }
    ]);
  
    // Crear un objeto timeValue con la fecha y el valor
    const timeValue = {
      date: new Date(answers.date).toISOString(),  // Convertir la fecha a timestamp compatible
      value: answers.value
    };
  
    await addTimeValue(answers.stampId, timeValue);
    await mainMenu();
  }
  

  if (answer.action === 'Modificar time value') {
    const answers = await inquirer.prompt([
      { name: 'stampId', message: 'ID de la estampilla:' },
      { name: 'date', message: 'Fecha (YYYY-MM-DD) del time value a modificar:' },
      { name: 'newValue', message: 'Nuevo valor (float):', type: 'number' }
    ]);
  
    // Convertir la fecha a formato ISO para asegurar coincidencia exacta
    const formattedDate = new Date(answers.date).toISOString();
  
    await updateTimeValue(answers.stampId, formattedDate, answers.newValue);
    await mainMenu();
  }

  if (answer.action === 'Salir') {
    console.log("Saliendo...");
    process.exit(0);
  }
}

async function startApp() {
  await createKeyspace();
  await createTable();
  await mainMenu();
}

startApp();
