const mongoose = require('mongoose');

// Connect to MongoDB
const ConnectDB = async () =>
{
    await mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) =>{
        console.log("MongoDb connection error: ", err);
        process.exit(1);
    })
    
}

module.exports = ConnectDB;