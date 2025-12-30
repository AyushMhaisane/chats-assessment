const express = require('express');
const router = express.Router();

const{
    getArticles,
    createArticle,
    updateArticle,
} = require('../controllers/articleController');

//Chain .get() and .post() for the same route
router.route('/').get(getArticles).post(createArticle);


router.route('/:id').put(updateArticle);

module.exports = router;

