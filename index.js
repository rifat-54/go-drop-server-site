require ('dotenv').config()
const express=require ('express')
const cors=require ('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt=require ('jsonwebtoken')
const cookieParser=require('cookie-parser')



const corsOptions={
  origin:['http://localhost:5173',
  'https://group-study-be847.web.app'
],
  credentials:true,
  optionalSuccessStatus:200
}



const app=express()
app.use(cors())
app.use(express.json())
app.use(cookieParser)
app.use(cors(corsOptions))

const port=process.env.PORT || 5000





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.umkvz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db=client.db('Go Drop')

    const userCollections=db.collection('users')





      //   jwt token

      app.post('/jwt',async(req,res)=>{
        const email=req.body;
        
        const token=jwt.sign(email,process.env.TOKEN_SECRET_KEY,{expiresIn:'1d'})
        res.cookie('token',token,{
            httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({success:true})
    })

    // remove token

    app.get('/logout',async(req,res)=>{
        res.clearCookie('token',{
            maxAge:0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({success:true})
    })

    // verify token

    const verifyToken=(req,res,next)=>{
        const token=req.cookies.token;
        if(!token){
           return res.status(401).send({message:'unauthorized access'})
        }
        jwt.verify(token,process.env.TOKEN_SECRET_KEY,(err,decoded)=>{
            if(err){
                return res.status(401).send({message:'unauthorized access'})
            }
            req.user=decoded;
            next()
        })

    }






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);







app.get('/',(req,res)=>{
    res.send('server is running')
})

app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
})