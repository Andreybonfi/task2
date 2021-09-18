const express = require("express");
const path = require('path');
const mysql = require("mysql");
const fs = require("fs");
const app = express();
const multer = require("multer");
app.set('view engine', 'hbs');
var Promises = require('promise');

let count = 1;
let fileN;


const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//Определение пути загрузки файлов через форму 
const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads");
    },

});

app.use(multer({ storage: storageConfig }).single("filedata"));

//Параматры  для подключения БД
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "task2",
    password: "",
});

//Создание соединения с БД  
connection.connect(function (err) {
    if (err) {
        return console.error("Ошибка: " + err.message);
    }

});


//Метод вызываемый формой загрузки файлов 
// Обрабатывает файл , добавляет его данные в БД
app.post("/upload", function (req, res) {

    let filedata = req.file;
    //Генерация имени файла с учетом последовательности загрузки
    fs.rename('./uploads/' + filedata.filename, './uploads/' + 'File-' + count + '.xlsx', (err) => {
    });
    setTimeout(parser, 2500, 'File-' + count + '.xlsx');
    let inf;

    //Запрос содержащий данные о всех загруженных файлах
    connection.query("SELECT * FROM files", function (err, res1) {

        inf = res1
    });
    let index = 1;

    //Запрос содержащий данные хранимые в файле 
    connection.query("SELECT f.index, a.bankNumber , e.classN ,e.about, b.active ,b.passive , c.debit, c.credit , d.active1 ,d.passive1 FROM files f JOIN  banks a ON a.fileN = ?  JOIN class e  ON e.classN = a.typeclass  JOIN openbalance b  ON b.index = a.index  JOIN turnovers  c  ON c.index = a.index  JOIN outbalances d ON d.index = a.index GROUP BY  a.bankNumber  ", [index], function (err, data) {

        res.render("index.hbs", {
            banks: data,
            file: inf
        });

    });
});

//Метод вызываемый выбором файл в форме  
// Вывод информации о нужном файде из бд
app.get("/edit/:index", (req, res) => {
   
    const index = req.params.index;
    let inf;

    connection.query("SELECT * FROM files", function (err, res1) {
        inf = res1;
    });

    connection.query("SELECT f.index, a.bankNumber , e.classN ,e.about, b.active ,b.passive , c.debit, c.credit , d.active1 ,d.passive1 FROM files f JOIN  banks a ON a.fileN = ?  JOIN class e  ON e.classN = a.typeclass  JOIN openbalance b  ON b.index = a.index  JOIN turnovers  c  ON c.index = a.index  JOIN outbalances d ON d.index = a.index GROUP BY  a.bankNumber  ", [index], function (err, data) {

        res.render("index.hbs", {
            banks: data,
            file: inf
        });

    });
});

//Метод вызываемый обращением к localhost:5000
app.get("/", (req, res) => {

    let inf;
    connection.query("SELECT * FROM files", function (err, res1) {
        if (err) console.log(err);
        inf = res1

    });
let index = 1;
    connection.query("SELECT f.index, a.bankNumber , e.classN ,e.about, b.active ,b.passive , c.debit, c.credit , d.active1 ,d.passive1 FROM files f JOIN  banks a ON a.fileN = ?  JOIN class e  ON e.classN = a.typeclass  JOIN openbalance b  ON b.index = a.index  JOIN turnovers  c  ON c.index = a.index  JOIN outbalances d ON d.index = a.index GROUP BY  a.bankNumber ,e.about ", [index], function (err, data) {
        res.render("index.hbs", {
            banks: data,
            file: inf
        });
    });
});

//Функция реализует чтение файла и его загрузку в бд 
function parser(name) {

    //Переменование файла на уникальное 


    //Получение информации из файла
    var XLSX = require('xlsx')
    name = 'File-' + count + '.xlsx';
    var workbook = XLSX.readFile('./uploads/' + name);
    var sheet_name_list = workbook.SheetNames;
    var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
    let class1 = 0;
    let string = Object.values(xlData);

    //Добавление файла в твблицу files БД
    const sqlf = `INSERT INTO files(namefile) VALUES (?) `;
    connection.query(sqlf, [name], function (err, results) {
        if (err) console.log(err);
    });
    for (let j = 7; j < string.length; j++) {

        let points = Object.values(string[j]);

        if (points == points[0]) {

            class1++;
        }
        else if (points[0] == 'ПО КЛАССУ' || points[0] == 'БАЛАНС') {

        }
        else {
            if (Number.isInteger(points[0])) { }
            else {

                const sql = `INSERT INTO banks(fileN,bankNumber,typeClass) VALUES (?,?,?) `;
                connection.query(sql, [count, points[0], class1], function (err, results) {
                    if (err) console.log(err);
                });
                
                const sql1 = `INSERT INTO outbalances(active1,passive1) VALUES (?,?) `;
                connection.query(sql1, [points[1], points[2]], function (err, results) {
                    if (err) console.log(err);
                });
                
                const sql2 = `INSERT INTO turnovers(debit,credit) VALUES (?,?) `;
                connection.query(sql2, [points[3], points[4]], function (err, results) {
                    if (err) console.log(err);
                });
                
                const sql3 = `INSERT INTO openbalance(active,passive) VALUES (?,?) `;
                connection.query(sql3, [points[5], points[6]], function (err, results) {
                    if (err) console.log(err);
                });


            }

        }
    }

    count = count + 1;
}


app.listen(5000, () => {
    console.log("Server work")
});

//exit();

//Закрытие подключения к БД
function exit() {
    connection.end(function (err) {
        if (err) {
            return console.log("Ошибка: " + err.message);
        }
        console.log("Подключение закрыто");
    });
}
