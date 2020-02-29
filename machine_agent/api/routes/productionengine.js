const express = require('express');
const  {getState, onUpdate} = require('../../data_provision/production_engine');

const productionEngineRoutes = express.Router();


productionEngineRoutes.post('/', (req, res, next) => {
    res.status(200).json({
        message: 'Handling POST on /products'
    });
});


productionEngineRoutes.get('/', (req, res, next) => {
    res.status(200).json(getState());
}
);

module.exports = productionEngineRoutes;