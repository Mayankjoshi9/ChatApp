const User=require("../models/user")
const otpGenerator=require("otp-generator");
const Otp=require("../models/otp")
const bcrypt=require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.login=async(req,res)=>{
    try{
       const { email,password}=req.body;
       if(!email || !password){
          res.status(403).json({
               success:false,
               message:"All Field are Required",
          })
       }
       const user=await User.findOne({email:email});
       if(!user){
        res.status(401).json({
            success:false,
            message:"user not registered"
        })
       }

       if(await bcrypt.compare(password,user.password)){
           const payload={
            email:user.email,
            id:user._id,
           }
           const token=jwt.sign(payload,process.env.JWT_SECRET,{
            expiresIn:"2h",
           });
           user.token=token;
           user.password=undefined;
           
           const options={
             expires:new Date(Date.now()+3*24*60*60*1000),
             httpOnly:true,
           };
            return res.cookie("token",token,options).status(200).json({
            success:true,
            token,
            user,
            message:"Login Successfull. "
           });
       }
       else{
        return  res.status(401).json({
            success:false,
            message:"Password is Incorrect",
        })
       }

    }catch(error){
         return res.status(500).json({
            success:false,
            message:"Unable to Login. Please Login Again! ",
         })
    }
};

exports.otp= async(req,res)=>{
    try{
        const{email}=req.body;
        if(!email){
            res.status(401).json({
                success:false,
                message:"Please Provide Email",
            })
        }
        const user=await User.findOne({email});
        if(user){
            res.status(401).json({
                success:false,
                message:"Already Register",
            })
        }

        var otp=otpGenerator.generate(6,
            {lowerCaseAlphabets:false , upperCaseAlphabets: false,
                 specialChars: false})
        
        let result=await Otp.findOne({otp});

        while(result){
             otp=otpGenerator.generate(6,
                {lowerCaseAlphabets:false , upperCaseAlphabets: false,
                     specialChars: false})
             result= await Otp.findOne({otp});
            
        }

        const otpBody=await Otp.create({email:email,otp:otp});

        res.status(200).json({
            success:true,
            message:"otp Created Successfully",
        })



    }catch(error){
        res.status(500).json({
            success:false,
            message:"Error in Creating Otp",
        })
    }
}

exports.signup=async (req,res)=>{
    try{
        const {name,email,password,confirmPassword,otp}= req.body;
        if ( !name || !email || !password || !confirmPassword || !otp) {
            return res.status(403).json({
                success: false,
                message: "All fields are required ",
            })
        }

        if(password!=confirmPassword){
            return res.status(400).json({
                success:false,
                message:"password and confirmPassword are not same",
            })
        }

        const ExistingUser=await User.findOne({email});
        if(ExistingUser){
            return res.status(400).json({
                success:false,
                message:"User Already Registered",
            })
        }
        const otpBody=await Otp.findOne({email}).sort({createdAt:-1}).limit(1);
        console.log(otpBody);
        if(otpBody.length==0){
            res.status(400).json({
                success:false,
                message:"otp not found"
            })
        }
        if(otpBody.otp!=otp){
           res.status(400).json({
            status:false,
            message:"Otp not Matching"
           })
        }
        const hashedPassword= await bcrypt.hash(password,10);
        const user=await User.create({email:email,name:name,
            password:hashedPassword});
        
        res.status(200).json({
            success:true,
            message:"User Registered Successfully",
        })

    }catch(error){
        res.status(500).json({
            success:false,
            message:"User can't registered.",
        })
    }
}