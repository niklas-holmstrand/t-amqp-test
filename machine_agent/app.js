const express = require('express');
const app = express();

//const productRoutes = require('./api/routes/products');
const productionEngineRoutes = require('./api/routes/productionengine');

//app.use('/products', productRoutes);
app.use('/pe', productionEngineRoutes);


/*
function nikfunk(req, res, next) {
    res.status(200).json({ message: 'Verkar också funka' });
}

app.use(nikfunk);

app.use((req, res, next) => {
    res.status(200).json({
        message: 'It works! putte'
    });
});
*/

module.exports = app;
