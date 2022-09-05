// node imdbTop250.js --excel=movies.xlsx --dataDir=moviePosters --source=https://www.imdb.com/chart/top --url=https://www.imdb.com

// npm install minimist
// npm install axios
// npm install puppeteer
// npm install jsdom
// npm install excel4node
// npm install pdf-lib

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel4node = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");
let puppeteer = require("puppeteer");

let args = minimist(process.argv);
// open site
// go to first title page
async function run() {
    let browser = await puppeteer.launch({
        headless: false,
        args: [
            '--start-maximized'
        ],
        defaultViewport: null
    });
    let pages = await browser.pages();
    let page = pages[0];
    await page.goto(args.source);


    // making folder for all movie posters
    // if (fs.existsSync("Movie Posters") == true) {
    //     fs.rmdirSync("Movie Posters", { recursive: true });
    // } 
    // fs.mkdirSync("Movie Posters");


    await handleAllTitles(page, browser);

    await browser.close();
}
run();

async function handleAllTitles(page, browser) {

    await page.waitForSelector("td.titleColumn > a");
    let allUrls = await page.$$eval("td.titleColumn > a", function (TD) {
        let urls = [];
        for (let i = 0; i < TD.length; i++) {
            let url = TD[i].getAttribute("href");
            urls.push(url);
        }
        return urls;
    })

    let allMovieData = [];
    for (let i = 0; i < 5; i++) {
        let ctab = await browser.newPage();
        let movieData = await getMovieData(ctab, args.url + allUrls[i])
        allMovieData.push(movieData);
        await ctab.close();
    }
    let movieKaJson = JSON.stringify(allMovieData);
    fs.writeFileSync("allMovieData.json", movieKaJson, "utf-8");

    prepareExcel(allMovieData, args.excel);
}

// async function getMovieDataAxios (ctab, fullURL){
//     let data = {
//         Title: "",
//         ReleaseDate: "",
//         Director: "",
//         Genre: "",
//         Rating: ""
//     }
//     await ctab.bringToFront();
//     await ctab.goto(fullURL);

//     let respPrm = axios.get(fullURL);
//     respPrm.then(function (response){
//         let html = response.data;
//         let dom = new jsdom.JSDOM(html);
//         let document = dom.window.document;
//         // let poster = document.querySelector("div.ipc-lockup-overlay__screen");

//     })

//     // let posterUrl = await ctab.$eval("a.ipc-lockup-overlay ipc-focusable", getAttribute('href'));

//     // let response = await Axios({
//     //     posterUrl,
//     //     method: 'GET',
//     //     responseType: 'stream'
//     // })        
// }

async function getMovieData(ctab, fullURL) {

    let data = {
        Title: "",
        ReleaseDate: "",
        Director: "",
        Genre: "",
        Rating: ""
    }
    await ctab.bringToFront();
    await ctab.goto(fullURL);
    await ctab.waitFor(2000);
    data.Title = await ctab.$eval("h1", element => element.textContent);
    data.ReleaseDate = await ctab.$eval("li[role='presentation'] > a", element => element.textContent);

    data.Director = await ctab.$eval("li[data-testid='title-pc-principal-credit'] li[role='presentation']", element => element.textContent);


    //TODO: for more than one genres
    data.Genre = await ctab.$eval("span.ipc-chip__text", element => element.textContent);

    data.Rating = await ctab.$eval("div[data-testid='hero-rating-bar__aggregate-rating__score']", element => element.textContent);

    // const IMAGE_SELECTOR = '#tsf > div:nth-child(2) > div > div.logo > a > img';
    // let imageHref = await page.evaluate((sel) => {
    //     return document.querySelector(sel).getAttribute('src').replace('/', '');
    // }, IMAGE_SELECTOR);

    // console.log("https://www.google.com/" + imageHref);
    // var viewSource = await page.goto("https://www.google.com/" + imageHref);
    // fs.writeFile(".googles-20th-birthday-us-5142672481189888-s.png", await viewSource.buffer(), function (err) {
    // if (err) {
    //     return console.log(err);
    // }

    return data;
}

function prepareExcel(allMovieData, excelFileName) {
    let wb = new excel4node.Workbook();
    let allGenres = [];
    for (let j = 0; j < allMovieData.length; j++) {
        addGenreIfNotAlreadyThere(allMovieData[j].Genre, allGenres);
    }
    for (let i = 0; i < allGenres.length; i++) {
        let sheet = wb.addWorksheet(allGenres[i]);
        sheet.cell(1, 1).string("Tite");
        sheet.cell(1, 2).string("Released");
        sheet.cell(1, 3).string("Director");
        sheet.cell(1, 4).string("Rating");
        let idx = 0;
        for (let j = 0; j < allMovieData.length; j++) {
            if (allMovieData[j].Genre == allGenres[i]) {

                sheet.cell(2 + idx, 1).string(allMovieData[j].Title);
                sheet.cell(2 + idx, 2).string(allMovieData[j].ReleaseDate);
                sheet.cell(2 + idx, 3).string(allMovieData[j].Director);
                sheet.cell(2 + idx, 4).string(allMovieData[j].Rating);
                idx++;
            }
        }
        wb.write(excelFileName);
    }

}

function addGenreIfNotAlreadyThere(Genre, allGenres) {
    let tidx = -1;
    for (let i = 0; i < allGenres.length; i++) {
        if (Genre == allGenres[i]) {
            tidx = i;
            break;
        }
    }
    if (tidx == -1) {
        allGenres.push(Genre);
    }
}


// download info using axios
// extract info using jsdom

