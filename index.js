require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const sharp = require('sharp');
const path = require('path');
const app = express();
const cors = require('cors');
const SSLCommerzPayment = require('sslcommerz-lts')
const nodemailer = require('nodemailer');
const easyinvoice = require('easyinvoice');
const fs = require('fs');
const pdf = require('html-pdf');
const { userInfo } = require('os');

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
      file.mimetype === 'video/mp4' ||
      file.mimetype === 'video/webm' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/jpeg'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .mp4, .webm, .png, .jpg, or .jpeg format allowed!'));
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

const store_id = process.env.Store_id;
const store_passwd = process.env.Store_pass;
const is_live = false; //true for live, false for sandbox

// console.log(store_id)
// console.log(store_passwd)
async function run() {
  try {

    // await client.connect();

    const UserData = client.db('TaharDB').collection('Users');
    const ProductData = client.db('TaharDB').collection('Products');
    const customarSpotlightData = client.db('TaharDB').collection('customarSpotlight');
    const returnData = client.db('TaharDB').collection('Return');
    const categoryData = client.db('TaharDB').collection('Category');
    const fabricsData = client.db('TaharDB').collection('fabrics');
    const Banner = client.db('TaharDB').collection('banner');
    const OrderData = client.db('TaharDB').collection('order');
    const PromocodeData = client.db('TaharDB').collection('promo');
    const videoData = client.db('TaharDB').collection('video');
    const InvoiceCollection = client.db('TaharDB').collection('invoice');
    const CashOnDeliveryData = client.db('TaharDB').collection('COD');
    const rating = client.db('TaharDB').collection('rating');


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


    app.patch('/users/:id', async (req, res) => {
      try {
        const id = req.params.id;

        console.log(id)
        const filter = { _id: new ObjectId(id) };
        const updateStatus = req.body;

        console.log(updateStatus)
        if (!updateStatus || !updateStatus.role) {
          return res.status(400).json({ error: 'Invalid request. Status is missing.' });
        }

        const updateDoc = {
          $set: {
            role: updateStatus.role
          }
        }

        const result = await UserData.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });




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

    //rating get data
    app.get('/rating', async (req, res) => {
      const result = await rating.find().toArray();
      res.send(result);
    })
    // rating post
    app.post('/rating', async (req, res) => {
      const ratingInfo = req.body;
      const result = await rating.insertOne(ratingInfo);
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

    app.get('/banner', async (req, res) => {
      const result = await Banner.find().toArray();
      res.send(result);
    })
    //post banner
    app.post('/banner', upload.single('images'), async (req, res) => {
      // const bannerData = req.body;

      const images = req.file.filename;
      const title = req.body.title;
      const description = req.body.description;

      const result = await Banner.insertOne({
        images,
        title,
        description
      });
      res.send(result);
    });

    app.delete('/banner/:id', async (req, res) => {

      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await Banner.deleteOne(query);
      res.send(result)
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
        const Clearance = req.body.Clearance;
        const category = req.body.category;
        const selectedColor = req.body.selectedColor;
        const fabrics = req.body.fabrics;
        const sellpercet = req.body.sellpercet;
        const UploaderEmail = req.body.UploaderEmail;
        const UploaderRole = req.body.UploaderRole;
        const Date = req.body.Date;

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
          Clearance,
          sellpercet,
          selectedColor,
          fabrics,
          gender,
          UploaderEmail,
          UploaderRole,
          description,
          Date,

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

    app.get('/video', async (req, res) => {
      const result = await videoData.find().toArray();
      res.send(result);
    })


    app.get('/video/:id', async (req, res) => {
      const videoId = req.params.id;

      try {
        const result = await videoData.findOne({ _id: ObjectId(videoId) });

        if (!result) {
          return res.status(404).json({ message: 'Category not found' });
        }

        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // video get by id
    app.get('/video/:id', async (req, res) => {

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await videoData.findOne(filter);
      res.json(result);

    });

    // video post
    app.post('/video', upload.single('video'), async (req, res) => {
      try {
        // Process other form fields
        console.log(req.body)
        const title = req.body.title;
        const video = req.file;

        console.log(video)

        // console.log(req.files)
        // Save the data to MongoDB
        const result = await videoData.insertOne({ title, video, status: 'Inactive' });

        console.log(result)
        res.json({ message: 'Video added successfully', videoId: result.insertedId });
      } catch (error) {
        console.error('Error adding Video:', error);
        res.status(500).json({ error: 'An error occurred while adding the video' });
      }
    });



    app.patch('/video/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const filter = { _id: new ObjectId(id) };
      const updateStatus = req.body;
      // console.log(updateStatus);

      const updateDoc = {
        $set: {
          status: updateStatus.status
        }
      }

      const result = await videoData.updateOne(filter, updateDoc);
      res.send(result);
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


    // update category status
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

    ////user cart get
    // app.get('/userCartData', async (req, res) => {
    //   const result = await CartData.find().toArray();
    //   res.send(result)
    // })
    //user cart post
    // app.post('/userCartData', async (req, res) => {
    //   const { customerEmail, customerName, ProductHeightQuantity, ProductName, ProductImage, ProductPrice, ProductSize, ProductQuantity } = req.body;

    //   const result = await CartData.insertOne({
    //     customerEmail,
    //     customerName,
    //     ProductName,
    //     ProductPrice,
    //     ProductImage,
    //     ProductSize,
    //     ProductQuantity,
    //     ProductHeightQuantity
    //   });
    //   res.json({ success: true, message: 'Product added successfully' });
    // });

    //update cart quantity
    // app.patch('/userCartData/:productId', async (req, res) => {
    //   const productId = req.params.productId;
    //   const filter = { _id: new ObjectId(productId) };
    //   const newQuantity = req.body;
    //   console.log(newQuantity);
    //   const updateDoc = {
    //     $set: {
    //       ProductQuantity: newQuantity.ProductQuantity
    //     }
    //   }

    //   const result = await CartData.updateOne(filter, updateDoc);
    //   res.send(result);

    // });


    // await client.db("admin").command({ ping: 1 });

    const tran_id = new ObjectId().toString();
    app.post('/orders', async (req, res) => {


      const { localCartData } = req.body;
      console.log(req.body);
      // console.log('Order Details:', localCartData);
      if (localCartData && localCartData.length > 0) {
        // console.log('Order Details:', localCartData);
        const product_names = localCartData.map(product => product.ProductName);

        const data = {

          total_amount: parseFloat(req.body?.subtotalTaxandShipping),
          currency: req.body?.selectedCurrencyValue,
          tran_id: tran_id, // use unique tran_id for each api cal
          success_url: `http://localhost:5000/payment/success/${tran_id}`,
          fail_url: `http://localhost:5000/payment/fail/${tran_id}`,
          cancel_url: 'http://localhost:3030/cancel',
          ipn_url: 'http://localhost:3030/ipn',
          shipping_method: req.body?.selectedOption,
          product_name: product_names.join(', '),
          product_category: 'ALL',
          product_profile: 'general',
          cus_name: req.body?.FirstName,
          cus_email: req.body?.email,
          cus_add1: req.body?.Address,
          cus_add2: req.body?.Address,
          cus_city: req.body?.City,
          cus_state: req.body?.City,
          cus_postcode: req.body?.PostalCode,
          cus_country: req.body?.Country,
          cus_phone: req.body?.number,
          cus_fax: req.body?.number,
          ship_name: req.body?.FirstName,
          ship_add1: req.body?.Address,
          ship_add2: req.body?.Address,
          ship_city: req.body?.City,
          ship_state: req.body?.City,
          ship_postcode: req.body?.PostalCode,
          ship_country: req.body?.Country,
          date: req.body?.currentDate,
          discount: req.body?.discount
        }

        console.log(data)

        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
        sslcz.init(data).then(apiResponse => {
          // Redirect the user to payment gateway
          let GatewayPageURL = apiResponse.GatewayPageURL
          res.send({ GatewayPageURL })
          console.log('Redirecting to: ', GatewayPageURL)
        });

        const finalOrder = {
          localCartData,
          paidStatus: false,
          tranjection_id: tran_id,
          Confirm: 'Processing',
          data: data
        }

        const result = OrderData.insertOne(finalOrder);
      };
    })

    // payment success
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sharpx225@gmail.com',
        pass: 'twyogsikwxupbzdf'
      }
    });

    // Update your payment success route
    app.post("/payment/success/:tranId", async (req, res) => {
      // console.log(req.params.tranId);
      try {
        console.log(req.params.tranId);
        const result = await OrderData.updateOne(
          { tranjection_id: req.params.tranId },
          {
            $set: {
              paidStatus: true
            }
          }
        );
        console.log(result);
        console.log(result.modifiedCount)
        if (result.modifiedCount > 0) {

          const order = await OrderData.findOne({ tranjection_id: req.params.tranId });
          console.log(order);
          const recipientEmail = order.data.cus_email;

          const emailTemplate = fs.readFileSync('./email.html', 'utf8');

          // Replace placeholders in the email template
          const emailBody = emailTemplate
            .replace('{{customerName}}', order.data.cus_name)
            .replace('{{orderMessage}}', 'Your order has been successfully completed and delivered to you!')
            .replace('{{productRows}}', order.localCartData.map(product => `
            <tr>
              <td>${product.ProductName}</td>
              <td>${product.ProductQuantity}</td>
              <td>${product.ProductSize}</td>
              <td>${product.ProductPrice}</td>
            </tr>
          `).join(''))
            .replace('{{totalAmount}}', order.data.total_amount)
            .replace('{{thankYouMessage}}', 'Thank you for your order!')
            .replace('{{websiteLink}}', 'https://damnitrahul.com/')
            .replace('{{websiteName}}', 'damnitrahul.com');

          const mailOptions = {
            from: 'sharpx225@gmail.com',
            to: recipientEmail,
            subject: 'Tahar Payment Successful',
            html: emailBody
          };

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.error(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });

          res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`);
        }
      } catch (error) {
        console.error(error);
        // Handle the error in an appropriate way, e.g., send an error response to the client
        res.status(500).send('Internal Server Error');
      }
    });

    //get succesful orders
    app.get('/orders', async (req, res) => {
      const result = await OrderData.find().toArray();
      res.send(result);
    });


    app.patch('/orders/:id', async (req, res) => {
      try {
        const id = req.params.id;

        console.log(id)
        const filter = { _id: new ObjectId(id) };
        const updateStatus = req.body;

        console.log(updateStatus)
        // if (!updateStatus || !updateStatus.Confirm) {
        //   return res.status(400).json({ error: 'Invalid request. Status is missing.' });
        // }

        const updateDoc = {
          $set: {
            Confirm: updateStatus.Confirm
          }
        }

        const result = await OrderData.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    // payment fail
    app.post("/payment/fail/:tranId", async (req, res) => {
      // console.log(req.params.tranId)
      const result = await OrderData.deteteOne({ tranjection_id: req.params.tranId });
      if (result.deletedCount) {
        res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
      }

    })




    // cash on delivery post
    app.post('/CODorder', async (req, res) => {
      // Assuming you want to process the data received in `req.body`
      const data = req.body;

      result = await CashOnDeliveryData.insertOne({ data });
      res.json({ success: true }); // Assuming a successful response
    });

    //get cod orders
    app.get('/CODorder', async (req, res) => {
      const result = await CashOnDeliveryData.find().toArray();
      res.send(result);
    });

    //get promo code
    app.get('/promocode', async (req, res) => {
      const result = await PromocodeData.find().toArray();
      res.send(result);
    })

    // promo?coupon post
    app.post('/promocode', async (req, res) => {
      const data = req.body;
      const result = await PromocodeData.insertOne(data);
      res.send(result);

    })




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