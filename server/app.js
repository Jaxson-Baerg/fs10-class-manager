const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cookieSession = require("cookie-session");
const createError = require('http-errors');
const logger = require('morgan');
// const favicon = require('serve-favicon');

const homeRouter = require('./routes/home');
const scheduleRouter = require('./routes/schedule');
const aboutRouter = require('./routes/about');

const studentsRouter = require('./routes/students');
const classesRouter = require('./routes/classes');
const classTypesRouter = require('./routes/class_types');

const app = express();

// const cors = require('cors');
// const corsOptions ={
//     origin:'http://localhost:3000', 
//     credentials:true,            //access-control-allow-credentials:true
//     optionSuccessStatus:200
// }
// app.use(cors(corsOptions));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cookieSession({
  name: 'fortysix10fitness',
  keys:['SecretKey','anotherSecretKey'],
  maxAge: 24* 60 * 60 * 1000
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', homeRouter);
app.use('/schedule', scheduleRouter);
app.use('/about', aboutRouter);

app.use('/students', studentsRouter);
app.use('/classes', classesRouter);
app.use('/class_types', classTypesRouter);
// app.use(favicon(__dirname + '/public/images/favicon.ico'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;