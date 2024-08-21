const express = require('express');

const app = express();

app.get('/about', (req, res) => {
    res.send('About');
})

app.listen(3000, () => {
    console.log("listening on port 3000");
})