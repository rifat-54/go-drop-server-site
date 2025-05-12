require ('dotenv').config()
const express=require ('express')
const cors=require ('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt=require ('jsonwebtoken')
const cookieParser=require('cookie-parser')



const corsOptions={
  origin:['http://localhost:5173',
  
],
  credentials:true,
  optionsSuccessStatus: 200
}



const app=express()
app.use(express.json())
// app.use(cors())   //comment this for stop Access-Control-Allow-Origin from any here
app.use(cookieParser())
app.use(cors(corsOptions))    //only allow withcreadential .

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

    const db=client.db('GoDrop')

    const userCollections=db.collection('users')
    const bookParcelCollections=db.collection('book-parcel')





      //   jwt token

      app.post('/jwt',async(req,res)=>{
        const email=req.body;

        // console.log('email-> ',email);
        
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



    // save user to database

    app.post('/users',async(req,res)=>{
      const data=req.body;
      const email=data?.email;
      const query={email:email}
      data.userStatus='Not_Verify'

      const isExit=await userCollections.findOne(query)
      if(isExit){
        return res.send({message:'user already exit',insertedId:null})
      }

      const result=await userCollections.insertOne(data);

      res.send (result)

    })


    // get user role

    app.get('/user/role/:email',verifyToken,async(req,res)=>{
      const email=req.params.email;
     
      const query={email}
      const isExit=await userCollections.findOne(query)
      if(!isExit){
        return res.status(401).send('forbidden access')
      }
      const role=isExit?.role;
      res.send(role)
    })

    // save book parcel to database

    app.post('/book-parcel',async(req,res)=>{
      const data=req.body;
      data.status='Pending'

    

      const result =await bookParcelCollections.insertOne(data);
      res.send(result);

    })



    // get all users data           // Admin verify

    app.get('/allusers',verifyToken,async(req,res)=>{

      const result=await userCollections.aggregate([
        {
          $lookup:{
            from:'book-parcel',
            localField:'email',
            foreignField:'email',
            as:'parcel'
          }
        },
        {
          $project:{
            name:1,
            email:1,
            role:1,
            totalBooked:{$size:"$parcel"},
            toalCost:{$sum:"$parcel.price"},
            phone:{
              $arrayElemAt:[
                '$parcel.phone',
                {$subtract:[{$size:'$parcel.phone'},1]}
              ]
            }
          }
        }

      ]).toArray()

      
      res.send(result)
    })


    // get all parcel data             // verify admin routes

    app.get('/all-parcel',verifyToken,async(req,res)=>{
      const result =await bookParcelCollections.find().toArray()
      res.send(result);
    })


    // apply for delivery man to verify status

    app.post('/apply-deliveryman-status',verifyToken,async(req,res)=>{
      const data=req.body;
      const email=data?.email;

      const query={email}
      const updateDoc={
        $set:{
          userStatus:'Pending',
          phone:data?.phone,
          address:data.userAddress,
          age:data.age
        }
      }

      const result=await userCollections.updateOne(query,updateDoc)

      res.send(result)
      
    })


    // get all delivery man 

    app.get('/all-deliveryman',verifyToken,async(req,res)=>{
      const query={
        role:'Delivery Man'
      }

      const result=await userCollections.find(query).toArray()
      res.send(result)
    })


    // /update-deliveryman-status           //TO DO verify admin

    app.patch('/update-deliveryman-status/:id',verifyToken,async(req,res)=>{
      const id=req.params.id;

      const query={_id:new ObjectId(id)}
      const updateDoc={
        $set:{
          userStatus:'Verified'
        }
      }

      const result=await userCollections.updateOne(query,updateDoc)
      res.send(result)

    })


    // get all-verified-deleveryman     //TO DO verify admin

    app.get('/all-verified-deliveryman',verifyToken,async(req,res)=>{
      const query={
        role:'Delivery Man',
        userStatus:'Verified'
      }
      const result=await userCollections.find(query).toArray()
      res.send(result);

    })


    //assign-parcel-deliveryman     // to do verify admin

    app.patch('/assign-parcel-deliveryman/:id',verifyToken,async(req,res)=>{
      const id=req.params.id;
      const deliveryMan=req.body;
      // console.log(id,deliveryMan);
      const query={_id:new ObjectId(id)}

      const updateDoc={
        $set:{status:'On The Way',
          deliveryMan
        }
      }
      const result=await bookParcelCollections.updateOne(query,updateDoc)
      res.send(result)
      
    })



    // get my delivery list     // to do devivery man 

    app.get('/my-delivery-list/:email',verifyToken,async(req,res)=>{
      const email=req.params.email;
      const query={'deliveryMan.DeliveryManEmail':email}

      const result=await bookParcelCollections.find(query).toArray()
      res.send(result)

    })

    app.patch('/update-booking-status/:id',verifyToken,async(req,res)=>{
      const id=req.params.id;
      const data=req.body;
    
      const query={_id:new ObjectId(id)}
      const updateDoc={
        $set:{
          status:data?.newStatus
        }
      }

      const result =await bookParcelCollections.updateOne(query,updateDoc)
      res.send(result)
    })


    // update user role             // verify admin routes

    app.patch('/update-user-role/:id',verifyToken,async(req,res)=>{
      const id=req.params.id;
      const data=req.body;

      const query={_id:new ObjectId(id)}
      const updateDoc={
        $set:{
          role:data?.updateRole
        }
      }
      const result=await userCollections.updateOne(query,updateDoc)
      res.send(result)
      
    })
 





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);







app.get('/',(req,res)=>{
    res.send('server is running')
})

app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
})