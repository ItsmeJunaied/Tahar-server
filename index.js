require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const sharp = require('sharp');
const path = require('path');
const app = express();
const cors = require('cors');

const UPLOADS_folder = './uploads/';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_folder)
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const filename = file.originalname.replace(fileExt, '').toLocaleLowerCase().split(' ').join('-') + '-' + Date.now();
    cb(null, filename + fileExt)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 1000000,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/jpeg'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg .png or .jpeg format allowed!'));
    }
  }
});



const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  optionSuccessStatus: 200,
};


app.use(cors(corsOptions))

app.use(express.json());
//middleware
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_Password}@cluster0.zj6nics.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    await client.connect();

    const UserData = client.db('TaharDB').collection('Users');
    const ProductData = client.db('TaharDB').collection('Products');
    const customarSpotlightData = client.db('TaharDB').collection('customarSpotlight');
    const returnData = client.db('TaharDB').collection('Return');
    const categoryData = client.db('TaharDB').collection('Category');
    const fabricsData = client.db('TaharDB').collection('fabrics');



    app.get('/users', async (req, res) => {
      const result = await UserData.find().toArray();
      res.send(result);
    })


    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await UserData.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await UserData.insertOne(user);
      res.send(result);
    })



    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // customarSpotlightData
    app.get('/customarSpotlight', async (req, res) => {
      const result = await customarSpotlightData.find().toArray();
      res.send(result);
    })
    //adding customarSpotlightData through post method
    app.post('/customarSpotlight', async (req, res) => {
      const customarSpotlightInfo = req.body;
      // console.log(customarSpotlightInfo);
      const result = await customarSpotlightData.insertOne(customarSpotlightInfo);
      res.send(result);
    })

    //retun get data
    app.get('/return', async (req, res) => {
      const result = await returnData.find().toArray();
      res.send(result);
    })

    //retun Post

    app.post('/return', async (req, res) => {
      const returnInfo = req.body;
      const result = await returnData.insertOne(returnInfo);
      res.send(result);
    })


    // product get
    app.get('/product', async (req, res) => {
      const result = await ProductData.find().toArray();
      res.send(result);
    })

    // product get by id
    app.get('/product/:id', async (req, res) => {

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await ProductData.findOne(filter);
      res.json(result);

    });


    // product by category
    app.get('/product/category/:category', async (req, res) => {

      const category = req.params.category;
      const filter = { category: category };
      const result = await ProductData.find(filter).toArray();
      res.send(result);

    });

    // product post
    app.post('/product', upload.array('images'), async (req, res) => {
      try {
        // Process other form fields

        const images = req.files.map(file => file.filename);

        const title = req.body.title;
        const price = req.body.price;
        const gender = req.body.gender;
        const description = req.body.description;
        const Clearance = req.body.Clearance
        const category = req.body.category
        // const Othercategory = req.body.Othercategory
        const fabrics = req.body.fabrics
        // const otherfabric = req.body.otherfabric

        const Scolor = req.body.Scolor;
        const Mcolor = req.body.Mcolor;
        const Lcolor = req.body.Lcolor;
        const XLcolor = req.body.XLcolor;
        const XXLcolor = req.body.XXLcolor;
        const XXXLcolor = req.body.XXXLcolor;

        const Squantity = req.body.Squantity;
        const Mquantity = req.body.Mquantity;
        const Lquantity = req.body.Lquantity;
        const XLquantity = req.body.XLquantity;
        const XXLquantity = req.body.XXLquantity;
        const XXXLquantity = req.body.XXXLquantity

        // console.log(req.files)



        // Save the data to MongoDB
        const result = await ProductData.insertOne({
          title,
          price,
          images,
          category,
          // otherfabric,
          Clearance,
          // Othercategory,
          fabrics,
          gender,
          description,
          Scolor,
          Mcolor,
          Lcolor,
          XLcolor,
          XXLcolor,
          XXXLcolor,

          Squantity,
          Mquantity,
          Lquantity,
          XLquantity,
          XXLquantity,
          XXXLquantity,


        });

        res.json({ message: 'Product added successfully', productId: result.insertedId });
      } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'An error occurred while adding the product' });
      }
    });

    // categoryInfo get
    app.get('/categoryInfo', async (req, res) => {
      const result = await categoryData.find().toArray();
      res.send(result);
    })

    // categoryInfo get by id
    app.get('/categoryInfo/:id', async (req, res) => {
      const categoryId = req.params.id;

      try {
        const result = await categoryData.findOne({ _id: ObjectId(categoryId) });

        if (!result) {
          return res.status(404).json({ message: 'Category not found' });
        }

        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });


    // update status
    app.patch('/categoryInfo/:id', async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updateStatus = req.body;
      // console.log(updateStatus);

      const updateDoc = {
        $set: {
          status: updateStatus.status
        }
      }

      const result = await categoryData.updateOne(filter, updateDoc);
      res.send(result);
    });




    // categoryInfo post
    app.post('/categoryInfo', upload.single('categoryImage'), async (req, res) => {

      console.log(req.file)

      const image = req.file.filename;
      const title = req.body.CategoryTitle;
      const status = req.body.status;


      const result = await categoryData.insertOne({ image, title, status });
      res.json({ message: 'Category Information added successfully', productId: result.insertedId });
    })

    // fabriccs get
    app.get('/fabrics', async (req, res) => {
      const result = await fabricsData.find().toArray();
      res.send(result);
    })
    //fabrics post
    app.post('/fabrics', async (req, res) => {
      const fabricsType = req.body.fabrics;

      result = await fabricsData.insertOne({ fabricsType });

      res.json({ success: true, message: 'Fabrics type added successfully' });
    });

    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Tahar server is running')
})

app.listen(port, () => {
  console.log(`Tahar Port :${port}`)
})