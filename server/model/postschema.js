const mongoose=require("mongoose")
const commentSchema = require("../model/commentSchema");

const userschema=new mongoose.Schema({
       name: String,
       location: String,
       likes: [],
       postimage: String,
       descripation: String,
       date: String,
       comments: [],
})

const postmodel=mongoose.model("post",userschema)
module.exports=postmodel