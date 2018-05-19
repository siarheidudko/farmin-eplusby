var token,link,limit,offset,path, writeStream, summ, errors_g = 0;

const https=require("https"),
url=require("url"),
fs=require("fs");

//обработка ошибок потока записи
function callback(err){
	if(err){
		console.log(err);
		log(err);
		fs.unlinkSync(path);
		process.exit(0);
	}
}

//функция записи данных в поток
function JSONParser(data){
	return new Promise(function(resolve){
		try{
			let this_data = JSON.parse(data);
			if((typeof(this_data.rows) !== 'undefined') && (this_data.rows !== 0)){
				let this_data_array = this_data.data;
				for(let i = 0; i < this_data_array.length; i++){
					if((typeof(this_data_array[i].number) !== 'undefined') && (typeof(this_data_array[i].type) !== 'undefined') && (typeof(this_data_array[i].status) !== 'undefined')){
						let chunk = this_data_array[i].number + ';' + this_data_array[i].type + ';' + this_data_array[i].status + ';\n';
						writeStream.write(chunk, 'utf8', callback);
						summ++;
					}
				}
				resolve('parser_good');
			} else if(this_data.rows === 0){
				resolve('parser_final');
			} else {
				resolve('parser_bad');
			}
		} catch(e){
			resolve('parser_bad');
		}
	});
}

//функция получения N=limit карт со сдвигом offset (row=0 - вернет parser_final, ок - вернет parser_good, ошибка - вернет get_bad)
function GetCards(){
	return new Promise(function(resolve){
		try {
			let aplink = '?limit=' + limit + '&offset=' + offset;
			let getoptions = url.parse(link + aplink);
			getoptions.headers = {'X-AUTH-TOKEN':token};
			getoptions.timeout = 30000;
			var request = https.get(getoptions, function(response) {
				log('Код ответа сервера:' + response.statusCode);
				if (response.statusCode === 200) {
					let rawData = '';
					let errors = 0;
					response.on('data', (chunk) => { 
						rawData += chunk; 
					});
					response.on('end', () => { 
						if(errors === 0){
							JSONParser(rawData).then(function(value){
								if(value === 'parser_final'){
									resolve('get_final');
								} else if(value === 'parser_good'){
									offset = offset + limit;
									resolve('get_good');
								}else {
									resolve('get_bad');
								}
							});
						} else {
							resolve('get_bad');
						}
					});
					response.on('error', () => { 
						errors++;
					});
				} else {
					resolve('get_bad');
				}
			});
		} catch(e){
			resolve('get_bad');
		}
	});
}

//функция прохода от offset до состояния rows = 0, при ошибке попробует 5 раз, после чего вылетит (запишет в файл то что было успешно получено). в случае успеха счетчик ошибок сбрасывается
function GetCardsAll(){
	GetCards().then(function(value){
		switch(value){
			case 'get_good':
				log(summ + ':успешно');
				errors_g = 0;
				setTimeout(GetCardsAll, 5000);
				break;
			case 'get_final':
				offset = 0;
				writeStream.end();
				break;
			case 'get_bad':
				log(summ + ':ошибка');
				errors_g++;
				if(errors_g < 5){
					setTimeout(GetCardsAll, 10000);
				} else{
					console.log('Ошибка работы API, обработано записей:' + summ);
					log('Ошибка работы API, обработано записей:' + summ);
					process.exit(0);
				}
				break;
			default:
				errors_g++;
				break;
		}
	});
}

//функция чтения файла конфигурации
function getSettings(){
	return new Promise(function (resolve){
		try {
			fs.readFile("./e-plus.conf", "utf8", function(error,data){
				if(error) throw error; 
				try {
					resolve(JSON.parse(data));
				} catch(e){
					console.log("Конфигурационный файл испорчен!");
					resolve('error');
				}
			});
		} catch (e) {
			console.log("Конфигурационный файл недоступен!");
			resolve('error');
		}
	});
}

//функция записи лога
function log(data){
	fs.appendFile('e-plus.log', datetime() + ' ' + data + '\n', (err) => {
	try{
		if (err) throw err;
	} catch(err){
		console.log('Ошибка записи лога!');
	}
	});
}

//функция для таймштампа
function datetime() {
	try {
		var dt = new Date();
		return '[' + dt.getDate() + '.' + (dt.getMonth()+1) + '.' + dt.getFullYear() + ' - ' + dt.getHours() + '.' + dt.getMinutes() + '.' + dt.getSeconds() + '] ';
	} catch(e) {
		console.log("Ошибка функции datetime()!");
	}
}

getSettings().then(function(value){
	if(value !== 'error'){
		//настройки
		token = value.token; //токен
		link = value.link; //ссылка для апи
		limit = parseInt(value.limit, 10); //размер запроса, таймаут запроса 5 сек.
		offset = parseInt(value.offset, 10); //для прохода установить в 0 (будет долго, т.е. [([кол-во карт]/limit)*5sec] )
		path = value.path; //файл для записи
		summ = 0;
		writeStream = fs.createWriteStream(path);
		
		//запуск
		GetCardsAll();
		
		//проверка конца потока
		writeStream.on('finish', () =>{
			console.log('Обработано записей: ' + summ);
		});
	}
});