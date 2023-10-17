const express = require('express');
const app = express();
const request = require('request');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

var passwordHash = require("password-hash");

app.use(bodyParser.json());




app.use(session({
  secret: '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',
  resave: true,
  saveUninitialized: true
}));


const port=3004

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views')));

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Filter} = require('firebase-admin/firestore');

var serviceAccount = require("./key.json");

initializeApp({
  credential: cert(serviceAccount)
});


const db = getFirestore();




app.set('view engine', 'ejs');


app.get("/", (req,res) => {
  res.render('home');
})

app.get("/signin", (req,res) => {
  res.render('signin');
})


app.post("/signupsubmit", function(req, res) {
  console.log(req.body);
  db.collection("userDemo")
      .where(
          Filter.or(
              Filter.where("email", "==", req.body.email),
              Filter.where("user_name", "==", req.body.user_name)
          )
      )
      .get()
      .then((docs) => {
          if (docs.size > 0) {
              res.send("Hey, this account already exists with the email and username.");
          } else {
              db.collection("userDemo")
                  .add({
                      user_name: req.body.user_name,
                      email: req.body.email,
                      password: passwordHash.generate(req.body.password),
                  })
                  .then(() => {
                      
                      res.redirect("/signin");
                  })
                  .catch(() => {
                      res.send("Something Went Wrong");
                  });
          }
      });
});


const CLIENT_ID = '515657176056-34igfnepvlj6edt26rdj36ffm72m9bmr.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3004/dashboard';  



app.get('/login', (req, res) => {
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=email%20profile`;
    res.redirect(authUrl);
});

app.get('/callback', (req, res) => {
  const authCode = req.query.code;

  if (!authCode) {
    console.error('Authorization code not found in the request.');
    return res.status(400).send('Authorization code not found.');
  }

  
  const tokenUrl = 'https://accounts.google.com/o/oauth2/token';
  const params = {
    code: authCode,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  };

  request.post({ url: tokenUrl, form: params }, (err, response, body) => {
    if (err) {
      res.send('Error while exchanging authorization code for access token');
      return res.status(500).send('Error while exchanging authorization code for access token');
    }

    const accessToken = JSON.parse(body).access_token;
    


    
    request.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }, (error, response, body) => {
      if (error) {
        return res.status(500).send('Error fetching user info from Google.');
      }

      const userInfo = JSON.parse(body);
      const userEmail = userInfo.email;
      const username = userInfo.name;

      db.collection("userDemo")
        .where("email", "==", userEmail)
        .get()
        .then((docs) => {
          if (docs.empty) {
            
            db.collection("userDemo")
              .add({
                user_name: username, 
                email: userEmail,
                
              })
              .then(() => {
                
                req.session.username = username; 
                res.redirect('/dashboard');
              })
              .catch(() => {
                res.send('Error while storing user data in Firestore.');
              });
          } else {
            
            req.session.username = username; 
            res.redirect('/dashboard');
          }
        })
        .catch(() => {
          res.send('Error while querying Firestore.');
        });
    });
  });
});





app.post("/signinsubmit", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  console.log(email)
  console.log(password)

  db.collection("userDemo")
    .where("email", "==", email)
    .get()
    .then((docs) => {
      if (docs.empty) {
        res.send("User not found");
      } else {
        let verified = false;
        docs.forEach((doc) => {
          verified = passwordHash.verify(password, doc.data().password);
          if (verified) {
            username = doc.data().user_name;
          }
        });
        if (verified) {
          req.session.username = username;
          res.redirect('/dashboard');
        } else {
          res.send("Authentication failed");
        }
      }
    })
    .catch((error) => {
      console.error("Error querying Firestore:", error);
      res.send("Something went wrong.");
    });
});




app.get("/signup",(req,res) =>{
  res.render("signup")
})


app.get("/home",(req,res) =>{
  res.render("home")
})


app.get("/dashboard",(req,res) =>{
  const username = req.session.username || 'Guest'; 
  res.render('dashboard', { username, session: req.session });
})


app.get("/dashboard1",(req,res) =>{
  const username = req.session.username || 'Guest'; 
  res.render('dashboard1', { username, session: req.session });
});

app.get('/dashboard2', (req, res) => {
  const username = req.session.username || 'Guest'; 
  res.render('dashboard2', { username, session: req.session });
});

app.get('/dashboard3', (req, res) => {
  const username = req.session.username || 'Guest'; 
  res.render('dashboard3', { username, session: req.session });
});

app.get('/dashboard4', (req, res) => {
  res.render('dashboard4');
});

app.get('/dashboard5', (req, res) => {
  res.render('dashboard5');
});


app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '/dashboard')); 
});

const PORT = process.env.PORT || 3004;

app.listen(port, () => {
  console.log('Example app listening on port 3004')
})



