const inquirer = require('inquirer');
const { client } = require('./services/stampService');
const { createKeyspace, createTable, dropTable, createSAIIndex } = require('./db/setup');
const { addStamp, searchStamps, addTimeValue, updateTimeValue, getStampsBySeller, getMostExpensiveStampsByYear, getCheapestStampsByStatusAndYearRange, buyStamp } = require('./services/stampService');

async function showTable() {
  try {
    await client.connect(); 
    const query = 'SELECT * FROM librepost.stamps;';
    const result = await client.execute(query);
    
    result.rows.forEach(row => {
      row.stamp_id = row.stamp_id.toString();
      console.log(row);
    });
    
    await mainMenu(); 
  } catch (err) {
    console.error('Error mostrando la tabla:', err);
    await mainMenu(); 
  }
}

async function mainMenu() {
  const answer = await inquirer.prompt({
    name: 'action',
    type: 'list',
    message: '¿Qué deseas hacer?',
    choices: [
      'Agregar estampilla', 
      'Buscar estampillas', 
      'Buscar estampillas por vendedor', 
      'Buscar estampilla más cara por condición', 
      'Buscar estampilla más barata por status', 
      'Comprar estampilla', 'Agregar time value', 
      'Modificar time value', 
      'Mostrar todos los campos de la tabla',
      'Salir'],
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

    answers.tags = answers.tags ? answers.tags.split(',').map(tag => tag.trim()) : [];

    await addStamp(answers);
    console.log('Estampilla agregada.');
    await mainMenu();
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
          // Redondear el valor a 2 decimales
          const formattedValue = value.toFixed(2);
          
          formattedTimeValue[date] = formattedValue;
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
      { name: 'date', message: 'Fecha (DD-MM-YYYY):' },
      { name: 'value', message: 'Valor (float):', type: 'number' }
    ]);

    const timeValue = {
      date: answers.date,
      value: answers.value
    };

    await addTimeValue(answers.stampId, timeValue);
    await mainMenu();
  }

  if (answer.action === 'Modificar time value') {
    const answers = await inquirer.prompt([
      { name: 'stampId', message: 'ID de la estampilla:' },
      { name: 'date', message: 'Fecha (DD-MM-YYYY) del time value a modificar:' },
      { name: 'newValue', message: 'Nuevo valor (float):', type: 'number' }
    ]);

    await updateTimeValue(answers.stampId, answers.date, answers.newValue);
    await mainMenu();
  }

  if (answer.action === 'Buscar estampillas por vendedor') {
    const sellerAnswer = await inquirer.prompt([
      { name: 'seller', message: 'Ingrese el nombre del vendedor:' }
    ]);

    const results = await getStampsBySeller(sellerAnswer.seller);

    results.forEach(result => {
      result.stamp_id = result.stamp_id.toString();
    });

    console.log('Resultados de la búsqueda por vendedor:');
    console.table(results);
    await mainMenu();
  }

  if (answer.action === 'Buscar estampilla más cara por condición') {
    const yearAnswer = await inquirer.prompt([
      { name: 'year', message: 'Ingrese el año:' }
    ]);

    const results = await getMostExpensiveStampsByYear(yearAnswer.year);

    results.forEach(result => {
      if (result) {
        result.stamp_id = result.stamp_id.toString();
      }
    });

    console.log('Resultados de la búsqueda:');
    console.table(results.filter(result => result !== null)); // Filtrar resultados vacíos
    await mainMenu();
  }

  if (answer.action === 'Buscar estampilla más barata por status') {
    const yearRange = await inquirer.prompt([
      { name: 'startYear', message: 'Ingrese el año de inicio:' },
      { name: 'endYear', message: 'Ingrese el año de término:' }
    ]);

    const results = await getCheapestStampsByStatusAndYearRange(yearRange.startYear, yearRange.endYear);

    if (results && results.length > 0) {
      results.forEach(result => {
        result.stamp_id = result.stamp_id.toString();
        result.face_value = result.face_value.toFixed(2);
      });

      console.log('Resultados de la búsqueda:');
      console.table(results.filter(result => result !== null));
    } else {
      console.log('No se encontraron estampillas para el rango de años especificado.');
    }

    await mainMenu();
  }

  if (answer.action === 'Comprar estampilla') {
    const purchaseDetails = await inquirer.prompt([
      { name: 'title', message: 'Ingrese el título de la estampilla:' },
      { name: 'sellerId', message: 'Ingrese el nombre del vendedor:' }
    ]);

    await buyStamp(purchaseDetails.title, purchaseDetails.sellerId);
    await mainMenu();
  }

  if (answer.action === 'Mostrar todos los campos de la tabla') {
    await showTable();
  }

  if (answer.action === 'Salir') {
    console.log("Saliendo...");
    process.exit(0);
  }
}

async function startApp() {
  /* await dropTable(); */
  await createKeyspace();
  await createTable();
  await createSAIIndex();
  await mainMenu();
}

startApp();
