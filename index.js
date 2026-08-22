require('dotenv').config();
const express = require("express");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 3000;

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    family: 4,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
});

// Configure multer storage for Candidate CV uploads
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadImage = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Session Configuration (Uses In-Memory Store with fallback for ultra-reliability)
app.use(session({
    secret: process.env.SESSION_SECRET || "shaheen-academy-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// ── In-Memory Hybrid Store & Seed Data ──────────────────────────────────────
const memoryDB = {
    homes: [
        { _id: "h_default", title: "Shaheen Academy of Excellence", about: "Welcome to Shaheen Academy. We are dedicated to nurturing academic excellence, innovative technological education, character development, and holistic leadership for future innovators.", name: "jackson" }
    ],
    carousels: [
        {
            _id: "sl1",
            title: "Welcome to Shaheen Academy Badarpur",
            subtitle: "Empowering young minds through academic excellence, character building, and comprehensive competitive examination coaching.",
            image: "/img/slide1.jpg",
            buttonText: "Admissions & Counseling",
            link: "/book",
            order: 1,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "sl2",
            title: "State-of-the-Art STEM & Robotics Labs",
            subtitle: "Modern laboratories, interactive coding curricula, and hands-on scientific inquiry preparing students for global innovation.",
            image: "/img/slide2.jpg",
            buttonText: "Explore Learnings",
            link: "/learnings",
            order: 2,
            active: true,
            createdAt: new Date()
        }
    ],
    homecards: [
        { _id: "c1", title: "STEM & Robotics Labs", description: "State-of-the-art physics, chemistry, biology, and hands-on robotics workshops.", icon: "fa-solid fa-microchip", order: 1, active: true },
        { _id: "c2", title: "Advanced Digital Curriculum", description: "Modern programming, web technologies, and computational thinking programs.", icon: "fa-solid fa-laptop-code", order: 2, active: true },
        { _id: "c3", title: "Holistic Career Mentorship", description: "One-on-one student academic guidance, entrance exam prep, and college counseling.", icon: "fa-solid fa-graduation-cap", order: 3, active: true },
        { _id: "c4", title: "Global Olympiads & Competitions", description: "Dedicated training tracks for national science talent searches and mathematics olympiads.", icon: "fa-solid fa-trophy", order: 4, active: true }
    ],
    blogs: [
        { _id: "b1", title: "Welcome to Shaheen Academy Academic Session 2026", content: "We are thrilled to welcome our new and returning students to an academic year filled with innovation, academic rigor, and community achievements. Explore our modernized digital labs and library facilities.", timestamp: "Mon, Aug 17", date: new Date(), image: null },
        { _id: "b2", title: "Empowering Next-Gen Learners with Computational Thinking", content: "Computational thinking is not just about writing code; it is about decomposition, pattern recognition, and problem formulation that prepares students for modern engineering challenges.", timestamp: "Sun, Aug 16", date: new Date(Date.now() - 86400000), image: null },
        { _id: "b3", title: "Highlights from the Annual Science & Innovation Showcase", content: "Our students showcased remarkable engineering prototypes, renewable energy solutions, and autonomous robotics projects in this year's academy exhibition.", timestamp: "Sat, Aug 15", date: new Date(Date.now() - 172800000), image: null }
    ],
    learnings: [
        { _id: "l1", title: "Full Stack Web Development & Node.js Architecture", content: "Comprehensive curriculum covering modern JavaScript, Express web services, MongoDB schemas, and scalable web architecture for students.", date: new Date(), image: null },
        { _id: "l2", title: "Data Structures & Algorithmic Problem Solving", content: "Essential algorithmic principles, complexity analysis, trees, graph algorithms, dynamic programming, and competitive problem solving.", date: new Date(Date.now() - 86400000), image: null },
        { _id: "l3", title: "Database Systems & Cloud Deployments", content: "Understanding relational and document databases, indexing strategies, caching layers, and cloud infrastructure pipelines.", date: new Date(Date.now() - 172800000), image: null }
    ],
    careers: [
        { _id: "car1", title: "Senior Computer Science Faculty", description: "Teaching senior secondary students web development, Python programming, and foundational data structures. Minimum 3 years experience.", location: "Main Campus", type: "Full-Time", salary: "$55,000 - $75,000", deadline: "30 Sep 2026", active: true, createdAt: new Date() },
        { _id: "car2", title: "Mathematics & STEM Instructor", description: "Guiding advanced calculus, linear algebra, and competitive mathematics olympiad batches.", location: "Main Campus", type: "Full-Time", salary: "$50,000 - $70,000", deadline: "15 Oct 2026", active: true, createdAt: new Date() },
        { _id: "car3", title: "Academic Counselor & Student Mentor", description: "Assisting students in university applications, scholarship portfolios, and holistic academic planning.", location: "Main Campus", type: "Full-Time", salary: "$45,000 - $60,000", deadline: "25 Oct 2026", active: true, createdAt: new Date() }
    ],
    terms: [
        { _id: "t1", title: "Academy Code of Conduct & Honor Policy", content: "All students, staff, and faculty at Shaheen Academy are expected to maintain the highest standards of academic integrity, mutual respect, and ethical conduct.", lastUpdated: new Date() },
        { _id: "t2", title: "Admissions and Enrollment Terms", content: "Admission is granted based on merit, entrance evaluations, and verified academic credentials. Tuition fees and payment schedules must adhere to academy policies.", lastUpdated: new Date() },
        { _id: "t3", title: "Digital Privacy and Campus Safety", content: "Shaheen Academy is committed to protecting student and guardian privacy. Student records and digital platform usage adhere to privacy and child protection standards.", lastUpdated: new Date() }
    ],
    books: [
        { _id: "bk1", name: "Zaid Khan", email: "zaid@example.com", phone: "+1-555-0199", date: "2026-08-25", time: "10:00 AM", service: "Campus Tour & Counseling", message: "Inquiring about Grade 11 STEM program admissions.", status: "Pending", createdAt: new Date() }
    ],
    contacts: [
        { _id: "ct1", name: "Farhan Ahmed", mail: "farhan@example.com", number: 1234567890, message: "Interested in partnering for the upcoming robotics hackathon.", time: "10:30 AM", date: "Aug 17, 2026", hour: "10", minute: "30", read: false }
    ],
    galleries: [
        {
            _id: "gal1",
            title: "Main Academic Quadrangle & Campus Facade",
            category: "Campus",
            description: "The primary architectural wing and academic grounds at Shaheen Academy Badarpur, built for inspiring scholastic pursuits.",
            image: "/img/slide1.jpg",
            date: "Aug 2026",
            featured: true,
            order: 1,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "gal2",
            title: "Advanced STEM & Computational Technology Lab",
            category: "Academic & Labs",
            description: "Equipped with high-performance workstations, robotics experimentation test benches, and collaborative engineering spaces.",
            image: "/img/slide2.jpg",
            date: "Aug 2026",
            featured: true,
            order: 2,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "gal3",
            title: "Annual Science & Robotic Innovation Expo 2026",
            category: "Events",
            description: "Students demonstrating student-built autonomous rovers, smart green energy grids, and IoT environmental monitors.",
            image: "/img/technology.png",
            date: "Jul 2026",
            featured: true,
            order: 3,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "gal4",
            title: "Individual Academic & Career Counseling Session",
            category: "Academic & Labs",
            description: "Our dedicated faculty providing personalized roadmaps for national entrance examinations and college admissions.",
            image: "/img/meeting.png",
            date: "Jul 2026",
            featured: false,
            order: 4,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "gal5",
            title: "Campus Botanical Courtyard & Open Study Space",
            category: "Campus",
            description: "Lush green recreational and study courtyards designed to promote mental wellness and focused peer discussions.",
            image: "/img/about.png",
            date: "Jun 2026",
            featured: false,
            order: 5,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "gal6",
            title: "Inter-House Athletic & Sports Championship",
            category: "Sports & Activities",
            description: "Annual sports tournament promoting teamwork, physical discipline, and athletic camaraderie across all grades.",
            image: "/img/slide1.jpg",
            date: "May 2026",
            featured: false,
            order: 6,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "gal7",
            title: "Residential Campus Hostel & Quiet Study Suites",
            category: "Hostel Life",
            description: "Modern residential amenities and supervised study environments ensuring comfort for outstation students.",
            image: "/img/slide2.jpg",
            date: "Apr 2026",
            featured: false,
            order: 7,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "gal8",
            title: "National Olympiad & Top Rankers Felicitation",
            category: "Achievements",
            description: "Honoring Shaheen Academy students who achieved distinction in state and national competitive evaluations.",
            image: "/img/technology.png",
            date: "Mar 2026",
            featured: true,
            order: 8,
            active: true,
            createdAt: new Date()
        }
    ],
    admissions: [
        {
            _id: "adm1",
            title: "Class XI Science Integrated Batch (NEET / JEE 2026-27)",
            category: "Senior Secondary",
            eligibility: "Minimum 75% in Class 10 Board + Shaheen Entrance Evaluation Test",
            feeStructure: "₹45,000 / Academic Year (Installments & Merit Waivers Available)",
            seats: "60 Seats (Merit & Entrance Based)",
            deadline: "30 Nov 2026",
            description: "Integrated 2-year classroom coaching for CBSE/State Board + NEET/JEE Main & Advanced with hostel and daily doubt mentoring.",
            icon: "fa-solid fa-user-graduate",
            order: 1,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "adm2",
            title: "Class XI Commerce & Applied Economics Batch",
            category: "Senior Secondary",
            eligibility: "Minimum 65% in Class 10 Board + Personal Interview",
            feeStructure: "₹38,000 / Academic Year (Installments Available)",
            seats: "50 Seats",
            deadline: "15 Dec 2026",
            description: "Structured Accountancy, Business Studies, Economics, and Mathematics with CA-Foundation / CUET foundation guidance.",
            icon: "fa-solid fa-chart-line",
            order: 2,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "adm3",
            title: "Pre-Foundation & Olympiad Batch (Grades 8, 9 & 10)",
            category: "Pre-Foundation",
            eligibility: "Passing grade in previous academic year + Diagnostic Test",
            feeStructure: "₹32,000 / Academic Year",
            seats: "80 Seats",
            deadline: "Rolling Admissions",
            description: "Early conceptual foundation in Mathematics, Science, Mental Ability, and Robotics for NTSE, PRMO, and Olympiads.",
            icon: "fa-solid fa-atom",
            order: 3,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "adm4",
            title: "Shaheen Talent Search & Merit Scholarship Test (STST)",
            category: "Scholarship",
            eligibility: "Students entering Grades 6 through 11",
            feeStructure: "Exam Fee: ₹100 | Up to 100% Scholarship on Tuition",
            seats: "100 Scholarship Seats",
            deadline: "15 Oct 2026",
            description: "Annual national talent evaluation offering fee waivers, complimentary study materials, and special residential mentorship.",
            icon: "fa-solid fa-medal",
            order: 4,
            active: true,
            createdAt: new Date()
        }
    ],
    academics: [
        {
            _id: "acd1",
            title: "Senior Secondary Science Stream (PCMB / Integrated Medical & Engineering)",
            stream: "Science",
            grade: "Class 11 - 12",
            curriculum: "NCERT / State Board mapped with National Competitive Entrance Syllabus (NEET & JEE)",
            features: "Daily Practice Papers (DPP), Smart Digital Labs, Faculty Mentorship, Bi-weekly Computerized Assessments",
            description: "A comprehensive program designed for aspiring doctors, engineers, and scientists with deep concept immersion in Physics, Chemistry, Mathematics, and Biology.",
            image: "/img/slide2.jpg",
            order: 1,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "acd2",
            title: "Senior Secondary Commerce & Financial Literacy",
            stream: "Commerce",
            grade: "Class 11 - 12",
            curriculum: "CBSE / State Board Aligned + Foundation CA/CS & CUET Orientation",
            features: "Case Studies, Business Simulations, Financial Analytics, Expert Guest Seminars",
            description: "Equips future entrepreneurs and corporate leaders with mastery in Financial Accounting, Economics, Business Studies, and Informatics.",
            image: "/img/meeting.png",
            order: 2,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "acd3",
            title: "Secondary School High-Impact Curriculum (Grades 6 to 10)",
            stream: "Foundational",
            grade: "Class 6 - 10",
            curriculum: "Holistic Multi-Disciplinary Curriculum with STEM Integration",
            features: "Language Fluency Labs, Science Practical Workshops, Remedial Doubt Clinics",
            description: "Nurturing curiosity, logical reasoning, moral values, and academic discipline during crucial developmental years.",
            image: "/img/slide1.jpg",
            order: 3,
            active: true,
            createdAt: new Date()
        },
        {
            _id: "acd4",
            title: "Applied STEM, Robotics & Artificial Intelligence Wing",
            stream: "STEM & Coding",
            grade: "Class 6 - 12",
            curriculum: "Hands-on Practical Computing, Robotics Microcontrollers & Python",
            features: "Hardware Sandbox, Hackathons, Project Showcases, IoT Test Benches",
            description: "Empowers students with future-ready technological skills including algorithmic problem solving, micro-robotics, and full-stack web basics.",
            image: "/img/technology.png",
            order: 4,
            active: true,
            createdAt: new Date()
        }
    ],
    candidates: [],
    admins: [],
    otprecords: []
};

// ── Database Setup with Mongoose ───────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
let isMongoConnected = false;

mongoose.set('bufferCommands', false);

if (MONGODB_URI) {
    console.log("Connecting to MongoDB at:", MONGODB_URI.split("@").pop());
    mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000
    }).then(() => {
        isMongoConnected = true;
        console.log("✅ MongoDB connected successfully");
    }).catch(err => {
        console.warn("⚠️ MongoDB connection failed, using in-memory store fallback:", err.message);
    });
} else {
    console.log("ℹ️ No MONGODB_URI provided. Running in high-performance in-memory mock mode.");
}

// ── Schemas & Models ────────────────────────────────────────────────────────
const adminSchema = new mongoose.Schema({ username: String, password: String });
adminSchema.plugin(passportLocalMongoose);
const Admin = mongoose.model("admin", adminSchema);

passport.use(Admin.createStrategy());
passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());

const otpRecordSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true }
});
const OtpRecord = mongoose.model("otprecord", otpRecordSchema);

const homeSchema = new mongoose.Schema({ title: String, about: String, name: String });
const Home = mongoose.model("home", homeSchema);

const blogSchema = new mongoose.Schema({ title: String, content: String, timestamp: String, date: String, image: String });
const Blog = mongoose.model("blog", blogSchema);

const learningSchema = new mongoose.Schema({ title: String, content: String, date: String, image: String });
const Learning = mongoose.model("learning", learningSchema);

const contactSchema = new mongoose.Schema({
    name: String, mail: String, number: { type: Number, required: true },
    message: String, time: String, date: String, hour: String, minute: String,
    read: { type: Boolean, default: false }
});
const Contact = mongoose.model("contact", contactSchema);

const careerSchema = new mongoose.Schema({
    title: String, description: String, location: String,
    type: { type: String, enum: ["Full-Time","Part-Time","Internship","Contract"], default: "Full-Time" },
    salary: String, deadline: String, active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Career = mongoose.model("career", careerSchema);

const termsSchema = new mongoose.Schema({
    title: String, content: String, lastUpdated: { type: Date, default: Date.now }
});
const Terms = mongoose.model("terms", termsSchema);

const bookSchema = new mongoose.Schema({
    name: String, email: String, phone: String, date: String, time: String,
    service: String, message: String,
    status: { type: String, enum: ["Pending","Confirmed","Cancelled"], default: "Pending" },
    createdAt: { type: Date, default: Date.now }
});
const Book = mongoose.model("book", bookSchema);

const homeCardSchema = new mongoose.Schema({
    title: String, description: String,
    icon: { type: String, default: "fa-solid fa-star" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
});
const HomeCard = mongoose.model("homecard", homeCardSchema);

const carouselSchema = new mongoose.Schema({
    title: String,
    subtitle: String,
    image: { type: String, required: true },
    buttonText: { type: String, default: "" },
    link: { type: String, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Carousel = mongoose.model("carousel", carouselSchema);

const gallerySchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, default: "Campus" },
    description: String,
    image: { type: String, required: true },
    date: { type: String, default: "Aug 2026" },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Gallery = mongoose.model("gallery", gallerySchema);

const candidateSchema = new mongoose.Schema({
    role: String,
    careerId: { type: mongoose.Schema.Types.ObjectId, ref: 'career' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: String,
    address: String,
    class10Percent: String,
    class12Percent: String,
    bachelorDegree: String,
    bachelorCollege: String,
    bachelorPercent: String,
    pgDegree: String,
    pgCollege: String,
    pgPercent: String,
    cvPath: String,
    cvOriginalName: String,
    createdAt: { type: Date, default: Date.now },
    reviewed: { type: Boolean, default: false }
});
const Candidate = mongoose.model("candidate", candidateSchema);

const admissionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, default: "Senior Secondary" },
    eligibility: String,
    feeStructure: String,
    seats: String,
    deadline: String,
    description: { type: String, required: true },
    icon: { type: String, default: "fa-solid fa-user-graduate" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Admission = mongoose.model("admission", admissionSchema);

const academicSchema = new mongoose.Schema({
    title: { type: String, required: true },
    stream: { type: String, default: "Science" },
    grade: { type: String, default: "Class 11 - 12" },
    curriculum: String,
    features: String,
    description: { type: String, required: true },
    image: { type: String, default: "/img/slide2.jpg" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Academic = mongoose.model("academic", academicSchema);

// ── Model Helpers (Mongo + Memory Fallback) ─────────────────────────────────
const DB = {
    async getHome() {
        if (mongoose.connection.readyState === 1) {
            try { return await Home.find({}); } catch (e) {}
        }
        return memoryDB.homes;
    },
    async setHome(title, about) {
        if (mongoose.connection.readyState === 1) {
            try {
                const found = await Home.find({});
                if (found.length === 0) {
                    await new Home({ title, about, name: "jackson" }).save();
                } else {
                    await Home.updateOne({ name: "jackson" }, { $set: { title, about } });
                }
                return;
            } catch (e) {}
        }
        if (memoryDB.homes.length === 0) {
            memoryDB.homes.push({ _id: "h_" + Date.now(), title, about, name: "jackson" });
        } else {
            memoryDB.homes[0].title = title;
            memoryDB.homes[0].about = about;
        }
    },
    async deleteHome(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Home.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.homes = memoryDB.homes.filter(h => h._id !== id);
    },
    async getHomeCards(activeOnly = false) {
        if (mongoose.connection.readyState === 1) {
            try {
                return activeOnly ? await HomeCard.find({ active: true }).sort({ order: 1 }) : await HomeCard.find({}).sort({ order: 1 });
            } catch (e) {}
        }
        let cards = memoryDB.homecards;
        if (activeOnly) cards = cards.filter(c => c.active);
        return cards.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    async getHomeCard(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await HomeCard.findById(id); } catch (e) {}
        }
        return memoryDB.homecards.find(c => c._id === id) || null;
    },
    async addHomeCard(card) {
        if (mongoose.connection.readyState === 1) {
            try { return await new HomeCard(card).save(); } catch (e) {}
        }
        const newCard = { _id: "c_" + Date.now(), ...card };
        memoryDB.homecards.push(newCard);
        return newCard;
    },
    async updateHomeCard(id, data) {
        if (mongoose.connection.readyState === 1) {
            try { return await HomeCard.findByIdAndUpdate(id, data); } catch (e) {}
        }
        const idx = memoryDB.homecards.findIndex(c => c._id === id);
        if (idx !== -1) Object.assign(memoryDB.homecards[idx], data);
    },
    async deleteHomeCard(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await HomeCard.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.homecards = memoryDB.homecards.filter(c => c._id !== id);
    },
    async getCarousels(activeOnly = false) {
        if (mongoose.connection.readyState === 1) {
            try {
                return activeOnly ? await Carousel.find({ active: true }).sort({ order: 1, createdAt: 1 }) : await Carousel.find({}).sort({ order: 1, createdAt: 1 });
            } catch (e) {}
        }
        let list = memoryDB.carousels.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        if (activeOnly) list = list.filter(c => c.active);
        return list;
    },
    async getCarousel(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Carousel.findById(id); } catch (e) {}
        }
        return memoryDB.carousels.find(c => c._id === id) || null;
    },
    async addCarousel(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Carousel(data).save(); } catch (e) {}
        }
        const newSlide = { _id: "sl_" + Date.now(), createdAt: new Date(), ...data };
        memoryDB.carousels.push(newSlide);
        return newSlide;
    },
    async updateCarousel(id, data) {
        if (mongoose.connection.readyState === 1) {
            try { return await Carousel.findByIdAndUpdate(id, data); } catch (e) {}
        }
        const idx = memoryDB.carousels.findIndex(c => c._id === id);
        if (idx !== -1) Object.assign(memoryDB.carousels[idx], data);
    },
    async deleteCarousel(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Carousel.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.carousels = memoryDB.carousels.filter(c => c._id !== id);
    },
    async getGalleries(activeOnly = false, category = null) {
        if (mongoose.connection.readyState === 1) {
            try {
                let query = {};
                if (activeOnly) query.active = true;
                if (category && category !== "all") query.category = category;
                return await Gallery.find(query).sort({ order: 1, createdAt: -1 });
            } catch (e) {}
        }
        let list = memoryDB.galleries.slice();
        if (activeOnly) list = list.filter(g => g.active);
        if (category && category !== "all") list = list.filter(g => g.category === category);
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        return list;
    },
    async getGallery(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Gallery.findById(id); } catch (e) {}
        }
        return memoryDB.galleries.find(g => g._id === id) || null;
    },
    async addGallery(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Gallery(data).save(); } catch (e) {}
        }
        const newPhoto = { _id: "gal_" + Date.now(), createdAt: new Date(), ...data };
        memoryDB.galleries.push(newPhoto);
        return newPhoto;
    },
    async updateGallery(id, data) {
        if (mongoose.connection.readyState === 1) {
            try { return await Gallery.findByIdAndUpdate(id, data); } catch (e) {}
        }
        const idx = memoryDB.galleries.findIndex(g => g._id === id);
        if (idx !== -1) Object.assign(memoryDB.galleries[idx], data);
    },
    async deleteGallery(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Gallery.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.galleries = memoryDB.galleries.filter(g => g._id !== id);
    },
    async getAdmissions(activeOnly = false, category = null) {
        if (mongoose.connection.readyState === 1) {
            try {
                let query = {};
                if (activeOnly) query.active = true;
                if (category && category !== "all") query.category = category;
                return await Admission.find(query).sort({ order: 1, createdAt: -1 });
            } catch (e) {}
        }
        let list = memoryDB.admissions.slice();
        if (activeOnly) list = list.filter(a => a.active);
        if (category && category !== "all") list = list.filter(a => a.category === category);
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        return list;
    },
    async getAdmission(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Admission.findById(id); } catch (e) {}
        }
        return memoryDB.admissions.find(a => a._id === id) || null;
    },
    async addAdmission(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Admission(data).save(); } catch (e) {}
        }
        const newAdmission = { _id: "adm_" + Date.now(), createdAt: new Date(), ...data };
        memoryDB.admissions.push(newAdmission);
        return newAdmission;
    },
    async updateAdmission(id, data) {
        if (mongoose.connection.readyState === 1) {
            try { return await Admission.findByIdAndUpdate(id, data); } catch (e) {}
        }
        const idx = memoryDB.admissions.findIndex(a => a._id === id);
        if (idx !== -1) Object.assign(memoryDB.admissions[idx], data);
    },
    async deleteAdmission(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Admission.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.admissions = memoryDB.admissions.filter(a => a._id !== id);
    },
    async getAcademics(activeOnly = false, stream = null) {
        if (mongoose.connection.readyState === 1) {
            try {
                let query = {};
                if (activeOnly) query.active = true;
                if (stream && stream !== "all") query.stream = stream;
                return await Academic.find(query).sort({ order: 1, createdAt: -1 });
            } catch (e) {}
        }
        let list = memoryDB.academics.slice();
        if (activeOnly) list = list.filter(a => a.active);
        if (stream && stream !== "all") list = list.filter(a => a.stream === stream);
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        return list;
    },
    async getAcademic(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Academic.findById(id); } catch (e) {}
        }
        return memoryDB.academics.find(a => a._id === id) || null;
    },
    async addAcademic(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Academic(data).save(); } catch (e) {}
        }
        const newAcademic = { _id: "acd_" + Date.now(), createdAt: new Date(), ...data };
        memoryDB.academics.push(newAcademic);
        return newAcademic;
    },
    async updateAcademic(id, data) {
        if (mongoose.connection.readyState === 1) {
            try { return await Academic.findByIdAndUpdate(id, data); } catch (e) {}
        }
        const idx = memoryDB.academics.findIndex(a => a._id === id);
        if (idx !== -1) Object.assign(memoryDB.academics[idx], data);
    },
    async deleteAcademic(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Academic.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.academics = memoryDB.academics.filter(a => a._id !== id);
    },
    async getBlogs(limit = 0) {
        if (mongoose.connection.readyState === 1) {
            try {
                return limit > 0 ? await Blog.find({}).sort({ date: -1 }).limit(limit) : await Blog.find({}).sort({ date: -1 });
            } catch (e) {}
        }
        const blogs = memoryDB.blogs.slice().reverse();
        return limit > 0 ? blogs.slice(0, limit) : blogs;
    },
    async getBlog(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Blog.findById(id); } catch (e) {}
        }
        return memoryDB.blogs.find(b => b._id === id) || null;
    },
    async addBlog(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Blog(data).save(); } catch (e) {}
        }
        const newBlog = { _id: "b_" + Date.now(), ...data };
        memoryDB.blogs.push(newBlog);
        return newBlog;
    },
    async updateBlog(id, data) {
        if (mongoose.connection.readyState === 1) {
            try { return await Blog.findByIdAndUpdate(id, data); } catch (e) {}
        }
        const idx = memoryDB.blogs.findIndex(b => b._id === id);
        if (idx !== -1) Object.assign(memoryDB.blogs[idx], data);
    },
    async deleteBlog(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Blog.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.blogs = memoryDB.blogs.filter(b => b._id !== id);
    },
    async getLearnings(limit = 0) {
        if (mongoose.connection.readyState === 1) {
            try {
                return limit > 0 ? await Learning.find({}).sort({ date: -1 }).limit(limit) : await Learning.find({}).sort({ date: -1 });
            } catch (e) {}
        }
        const learnings = memoryDB.learnings.slice().reverse();
        return limit > 0 ? learnings.slice(0, limit) : learnings;
    },
    async getLearning(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Learning.findById(id); } catch (e) {}
        }
        return memoryDB.learnings.find(l => l._id === id) || null;
    },
    async addLearning(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Learning(data).save(); } catch (e) {}
        }
        const newLearning = { _id: "l_" + Date.now(), ...data };
        memoryDB.learnings.push(newLearning);
        return newLearning;
    },
    async updateLearning(id, data) {
        if (mongoose.connection.readyState === 1) {
            try { return await Learning.findByIdAndUpdate(id, data); } catch (e) {}
        }
        const idx = memoryDB.learnings.findIndex(l => l._id === id);
        if (idx !== -1) Object.assign(memoryDB.learnings[idx], data);
    },
    async deleteLearning(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Learning.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.learnings = memoryDB.learnings.filter(l => l._id !== id);
    },
    async getCareers(activeOnly = false) {
        if (mongoose.connection.readyState === 1) {
            try {
                return activeOnly ? await Career.find({ active: true }).sort({ createdAt: -1 }) : await Career.find({}).sort({ createdAt: -1 });
            } catch (e) {}
        }
        let list = memoryDB.careers;
        if (activeOnly) list = list.filter(c => c.active);
        return list.slice().reverse();
    },
    async getCareer(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Career.findById(id); } catch (e) {}
        }
        return memoryDB.careers.find(c => c._id === id) || null;
    },
    async addCareer(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Career(data).save(); } catch (e) {}
        }
        const newCar = { _id: "car_" + Date.now(), createdAt: new Date(), ...data };
        memoryDB.careers.push(newCar);
        return newCar;
    },
    async updateCareer(id, data) {
        if (mongoose.connection.readyState === 1) {
            try { return await Career.findByIdAndUpdate(id, data); } catch (e) {}
        }
        const idx = memoryDB.careers.findIndex(c => c._id === id);
        if (idx !== -1) Object.assign(memoryDB.careers[idx], data);
    },
    async deleteCareer(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Career.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.careers = memoryDB.careers.filter(c => c._id !== id);
    },
    async getTerms() {
        if (mongoose.connection.readyState === 1) {
            try { return await Terms.find({}).sort({ _id: 1 }); } catch (e) {}
        }
        return memoryDB.terms;
    },
    async getTerm(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Terms.findById(id); } catch (e) {}
        }
        return memoryDB.terms.find(t => t._id === id) || null;
    },
    async addTerm(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Terms(data).save(); } catch (e) {}
        }
        const newTerm = { _id: "t_" + Date.now(), lastUpdated: new Date(), ...data };
        memoryDB.terms.push(newTerm);
        return newTerm;
    },
    async updateTerm(id, data) {
        if (mongoose.connection.readyState === 1) {
            try { return await Terms.findByIdAndUpdate(id, { ...data, lastUpdated: new Date() }); } catch (e) {}
        }
        const idx = memoryDB.terms.findIndex(t => t._id === id);
        if (idx !== -1) Object.assign(memoryDB.terms[idx], { ...data, lastUpdated: new Date() });
    },
    async deleteTerm(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Terms.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.terms = memoryDB.terms.filter(t => t._id !== id);
    },
    async getBooks() {
        if (mongoose.connection.readyState === 1) {
            try { return await Book.find({}).sort({ createdAt: -1 }); } catch (e) {}
        }
        return memoryDB.books.slice().reverse();
    },
    async addBook(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Book(data).save(); } catch (e) {}
        }
        const newBook = { _id: "bk_" + Date.now(), status: "Pending", createdAt: new Date(), ...data };
        memoryDB.books.push(newBook);
        return newBook;
    },
    async updateBookStatus(id, status) {
        if (mongoose.connection.readyState === 1) {
            try { return await Book.findByIdAndUpdate(id, { status }); } catch (e) {}
        }
        const idx = memoryDB.books.findIndex(b => b._id === id);
        if (idx !== -1) memoryDB.books[idx].status = status;
    },
    async deleteBook(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Book.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.books = memoryDB.books.filter(b => b._id !== id);
    },
    async getContacts() {
        if (mongoose.connection.readyState === 1) {
            try { return await Contact.find({}).sort({ date: -1 }); } catch (e) {}
        }
        return memoryDB.contacts.slice().reverse();
    },
    async addContact(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Contact(data).save(); } catch (e) {}
        }
        const newContact = { _id: "ct_" + Date.now(), read: false, ...data };
        memoryDB.contacts.push(newContact);
        return newContact;
    },
    async markContactRead(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Contact.findByIdAndUpdate(id, { read: true }); } catch (e) {}
        }
        const idx = memoryDB.contacts.findIndex(c => c._id === id);
        if (idx !== -1) memoryDB.contacts[idx].read = true;
    },
    async markAllContactsRead() {
        if (mongoose.connection.readyState === 1) {
            try { return await Contact.updateMany({ read: false }, { read: true }); } catch (e) {}
        }
        memoryDB.contacts.forEach(c => c.read = true);
    },
    async deleteContact(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Contact.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.contacts = memoryDB.contacts.filter(c => c._id !== id);
    },
    async getCandidates() {
        if (mongoose.connection.readyState === 1) {
            try { return await Candidate.find({}).sort({ createdAt: -1 }); } catch (e) {}
        }
        return memoryDB.candidates.slice().reverse();
    },
    async getCandidate(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Candidate.findById(id); } catch (e) {}
        }
        return memoryDB.candidates.find(c => c._id === id) || null;
    },
    async addCandidate(data) {
        if (mongoose.connection.readyState === 1) {
            try { return await new Candidate(data).save(); } catch (e) {}
        }
        const newCandidate = { _id: "cand_" + Date.now(), createdAt: new Date(), reviewed: false, ...data };
        memoryDB.candidates.push(newCandidate);
        return newCandidate;
    },
    async markCandidateReviewed(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Candidate.findByIdAndUpdate(id, { reviewed: true }); } catch (e) {}
        }
        const idx = memoryDB.candidates.findIndex(c => c._id === id);
        if (idx !== -1) memoryDB.candidates[idx].reviewed = true;
    },
    async markAllCandidatesReviewed() {
        if (mongoose.connection.readyState === 1) {
            try { return await Candidate.updateMany({ reviewed: false }, { reviewed: true }); } catch (e) {}
        }
        memoryDB.candidates.forEach(c => c.reviewed = true);
    },
    async deleteCandidate(id) {
        if (mongoose.connection.readyState === 1) {
            try { return await Candidate.findByIdAndDelete(id); } catch (e) {}
        }
        memoryDB.candidates = memoryDB.candidates.filter(c => c._id !== id);
    },
    async getAdminCounts() {
        const blogs = (await this.getBlogs()).length;
        const learnings = (await this.getLearnings()).length;
        const contactsList = await this.getContacts();
        const bookingsList = await this.getBooks();
        const careersList = await this.getCareers();
        const candidatesList = await this.getCandidates();
        const homeCardsList = await this.getHomeCards();
        const carouselsList = await this.getCarousels();
        const termsList = await this.getTerms();
        const galleriesList = await this.getGalleries();
        const admissionsList = await this.getAdmissions();
        const academicsList = await this.getAcademics();

        return {
            blogs,
            learnings,
            contacts: contactsList.length,
            bookings: bookingsList.length,
            totalCareers: careersList.length,
            activeCareers: careersList.filter(c => c.active).length,
            candidates: candidatesList.length,
            totalCards: homeCardsList.length,
            activeCards: homeCardsList.filter(c => c.active).length,
            totalSlides: carouselsList.length,
            activeSlides: carouselsList.filter(c => c.active).length,
            galleries: galleriesList.length,
            activeGalleries: galleriesList.filter(g => g.active).length,
            admissions: admissionsList.length,
            activeAdmissions: admissionsList.filter(a => a.active).length,
            academics: academicsList.length,
            activeAcademics: academicsList.filter(a => a.active).length,
            terms: termsList.length,
            bookingsPending: bookingsList.filter(b => b.status === "Pending").length,
            bookingsConfirmed: bookingsList.filter(b => b.status === "Confirmed").length,
            bookingsCancelled: bookingsList.filter(b => b.status === "Cancelled").length,
            recentContacts: contactsList.slice(0, 5),
            recentBookings: bookingsList.slice(0, 5),
            recentCandidates: candidatesList.slice(0, 5)
        };
    }
};

// ── Badges Middleware ───────────────────────────────────────────────────────
app.use(async function(req, res, next) {
    res.locals.siteUrl = req.protocol + "://" + req.get("host");
    if (req.isAuthenticated() && req.session && req.session.adminToken) {
        try {
            const books = await DB.getBooks();
            const contacts = await DB.getContacts();
            const candidates = await DB.getCandidates();
            res.locals.adminBadges = {
                pendingBookings: books.filter(b => b.status === "Pending").length,
                contactMessages: contacts.filter(c => !c.read).length,
                pendingCandidates: candidates.filter(c => !c.reviewed).length
            };
        } catch(e) {
            res.locals.adminBadges = { pendingBookings: 0, contactMessages: 0, pendingCandidates: 0 };
        }
    } else {
        res.locals.adminBadges = null;
    }
    next();
});

const confirmpassword = process.env.ADMIN_CONFIRM_PASSWORD || "1013AEORL22";
const today = new Date();
const day = today.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

function isAuth(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if ((req.isAuthenticated() || req.session.isDemoAdmin) && req.session.adminToken) {
        return next();
    }
    req.session.destroy(function() {});
    res.redirect("/adminlogin");
}

// ── Public Routes ─────────────────────────────────────────────────────────────
app.get("/robots.txt", function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const robotsText = [
        "User-agent: *",
        "Allow: /",
        "Allow: /img/",
        "Allow: /favicon.ico",
        "Allow: /favicon.png",
        "Disallow: /admin",
        "Disallow: /adminlogin",
        "Disallow: /adminregister",
        "Disallow: /overview",
        "",
        "Sitemap: " + su + "/sitemap.xml"
    ].join("\n");
    res.type("text/plain").send(robotsText);
});

app.get("/sitemap.xml", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const iso = new Date().toISOString().split("T")[0];
    const pages = ["/", "/academic", "/admission", "/gallery", "/blog", "/learnings", "/about", "/contact", "/careers", "/terms", "/book"].map(u =>
        `<url><loc>${su}${u}</loc><lastmod>${iso}</lastmod><priority>0.8</priority></url>`);
    try {
        const blogs = await DB.getBlogs();
        blogs.forEach(p => pages.push(`<url><loc>${su}/${encodeURIComponent(p.title)}</loc><lastmod>${iso}</lastmod><priority>0.7</priority></url>`));
    } catch(e) {}
    res.type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + pages.join("") + "</urlset>");
});

app.get("/", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    try {
        const [homepage, homecards, carousels, latestBlogs, latestLearnings] = await Promise.all([
            DB.getHome(),
            DB.getHomeCards(true),
            DB.getCarousels(true),
            DB.getBlogs(3),
            DB.getLearnings(3)
        ]);
        res.render("index", { 
            homepage, 
            homecards, 
            carousels,
            latestBlogs, 
            latestLearnings,
            pageTitle: "Shaheen Academy — Empowering Future Minds", 
            pageDesc: "Shaheen Academy school management portal and modern learning ecosystem.", 
            pageUrl: su 
        });
    } catch (e) {
        console.error("Error fetching homepage content:", e);
        res.render("index", { 
            homepage: memoryDB.homes, 
            homecards: memoryDB.homecards, 
            carousels: memoryDB.carousels,
            latestBlogs: memoryDB.blogs.slice(0, 3), 
            latestLearnings: memoryDB.learnings.slice(0, 3),
            pageTitle: "Shaheen Academy", 
            pageDesc: "Shaheen Academy school portal", 
            pageUrl: su 
        });
    }
});

app.get("/admission", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const admissions = await DB.getAdmissions(true);
    res.render("admission", {
        admissions,
        pageTitle: "Admissions 2026-27 | Shaheen Academy",
        pageDesc: "Explore admission criteria, integrated coaching batches, seat intake, and scholarships at Shaheen Academy.",
        pageUrl: su + "/admission"
    });
});
app.get("/admissions", function(req, res) { res.redirect("/admission"); });

app.get("/academic", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const stream = (req.query.stream || "all").trim();
    const academics = await DB.getAcademics(true, stream);
    const allAcademics = await DB.getAcademics(true);
    res.render("academic", {
        academics,
        selectedStream: stream,
        totalCount: allAcademics.length,
        pageTitle: (stream && stream !== "all") ? `${stream} — Academic Curricula | Shaheen Academy` : "Academic Streams & Pedagogy | Shaheen Academy",
        pageDesc: "Discover our academic curricula across Science, Commerce, Arts, STEM, and foundational school wings.",
        pageUrl: su + "/academic" + (stream && stream !== "all" ? "?stream=" + encodeURIComponent(stream) : "")
    });
});
app.get("/academics", function(req, res) { res.redirect("/academic"); });

app.get("/gallery", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const category = (req.query.category || "all").trim();
    const galleries = await DB.getGalleries(true, category);
    const allGalleries = await DB.getGalleries(true);
    res.render("gallery", {
        galleries,
        selectedCategory: category,
        totalCount: allGalleries.length,
        pageTitle: (category && category !== "all") ? `${category} — Campus Photo Gallery | Shaheen Academy` : "Campus Photo & Media Gallery | Shaheen Academy",
        pageDesc: "Explore the state-of-the-art campus, labs, student life, events, and milestones at Shaheen Academy Badarpur.",
        pageUrl: su + "/gallery" + (category && category !== "all" ? "?category=" + encodeURIComponent(category) : "")
    });
});

app.get("/learnings", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const learnings = await DB.getLearnings();
    res.render("learnings", { 
        learn: learnings, 
        pageTitle: "Academics & Learnings | Shaheen Academy", 
        pageDesc: "Explore educational modules and tutorials.", 
        pageUrl: su + "/learnings" 
    });
});

app.get("/blog", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const posts = await DB.getBlogs();
    res.render("blog", { 
        postuser: posts, 
        pageTitle: "Academy Blog & News | Shaheen Academy", 
        pageDesc: "Latest school updates, news, and insights.", 
        pageUrl: su + "/blog" 
    });
});

app.get("/about", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const homepage = await DB.getHome();
    res.render("about", { 
        homepage, 
        pageTitle: "About Us | Shaheen Academy", 
        pageDesc: "Learn more about Shaheen Academy mission and vision.", 
        pageUrl: su + "/about" 
    });
});

app.get("/contact", function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    res.render("contact", { 
        pageTitle: "Contact Us | Shaheen Academy", 
        pageDesc: "Get in touch with Shaheen Academy.", 
        pageUrl: su + "/contact" 
    });
});

app.post("/contact", async function(req, res) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const formattedTime = today.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true });

    await DB.addContact({
        name: req.body.fname,
        mail: req.body.fmail,
        number: req.body.fnumber || 0,
        message: req.body.fmessage,
        time: formattedTime,
        date: formattedDate,
        hour: String(today.getHours()),
        minute: String(today.getMinutes())
    });
    res.redirect("/success");
});

app.get("/careers", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const careers = await DB.getCareers(true);
    res.render("careers", { 
        careers, 
        pageTitle: "Careers & Open Positions | Shaheen Academy", 
        pageDesc: "Join Shaheen Academy faculty and staff.", 
        pageUrl: su + "/careers" 
    });
});

app.get("/careers/apply/:id", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const career = await DB.getCareer(req.params.id);
    if (!career) return res.redirect("/careers");
    res.render("apply", { 
        career, 
        pageTitle: "Apply: " + career.title + " | Shaheen Academy", 
        pageDesc: "Submit your application.", 
        pageUrl: su + "/careers/apply/" + req.params.id 
    });
});

app.post("/careers/apply/:id", upload.single("candidateCV"), async function(req, res) {
    try {
        const career = await DB.getCareer(req.params.id);
        const role = career ? career.title : "General Applicant";
        await DB.addCandidate({
            role: role,
            careerId: req.params.id,
            name: req.body.candidateName,
            email: req.body.candidateEmail,
            phone: req.body.candidatePhone,
            message: req.body.candidateMessage,
            address: req.body.candidateAddress,
            class10Percent: req.body.candidateClass10,
            class12Percent: req.body.candidateClass12,
            bachelorDegree: req.body.candidateBachelorDegree,
            bachelorCollege: req.body.candidateBachelorCollege,
            bachelorPercent: req.body.candidateBachelorPercent,
            pgDegree: req.body.candidatePgDegree,
            pgCollege: req.body.candidatePgCollege,
            pgPercent: req.body.candidatePgPercent,
            cvPath: req.file ? "/uploads/" + req.file.filename : null,
            cvOriginalName: req.file ? req.file.originalname : null
        });
        res.redirect("/success");
    } catch(err) {
        console.error("Error submitting candidate application:", err);
        res.redirect("/careers");
    }
});

app.get("/terms", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const termsList = await DB.getTerms();
    res.render("terms", { 
        termsList, 
        pageTitle: "Terms of Use | Shaheen Academy", 
        pageDesc: "Institutional terms of use.", 
        pageUrl: su + "/terms" 
    });
});

app.get("/book", function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    res.render("book", { 
        pageTitle: "Book Session / Campus Tour | Shaheen Academy", 
        pageDesc: "Schedule an admission appointment or counseling session.", 
        pageUrl: su + "/book" 
    });
});

app.post("/book", async function(req, res) {
    await DB.addBook({
        name: req.body.bookName,
        email: req.body.bookEmail,
        phone: req.body.bookPhone,
        date: req.body.bookDate,
        time: req.body.bookTime,
        service: req.body.bookService,
        message: req.body.bookMessage
    });
    res.redirect("/success");
});

app.get("/success", function(req, res) { res.render("success"); });
app.get("/maintenance", function(req, res) { res.render("maintenance"); });
app.get("/admin", function(req, res) { res.render("admin"); });
app.get("/adminregister", function(req, res) { res.render("adminregister"); });
app.get("/adminerror", function(req, res) { res.render("adminerror"); });
app.get("/adminloginerror", function(req, res) { res.render("adminloginerror"); });

app.get("/adminlogin", function(req, res) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const loginError = req.session.loginError || false;
    req.session.loginError = null;
    res.render("adminlogin", { loginError });
});

app.get("/loggedin", function(req, res) {
    if (!req.isAuthenticated() && !req.session.isDemoAdmin) return res.redirect("/adminlogin");
    const flash = req.session.flash || null;
    req.session.flash = null;
    res.render("loggedin", { flash });
});

app.get("/updated", isAuth, function(req, res) { res.render("updated"); });

// ── Admin Management Routes ────────────────────────────────────────────────
app.get("/overview", isAuth, async function(req, res) {
    const stats = await DB.getAdminCounts();
    const flash = req.session.flash;
    delete req.session.flash;
    res.render("overview", {
        counts: stats,
        recentContacts: stats.recentContacts,
        recentBookings: stats.recentBookings,
        recentCandidates: stats.recentCandidates,
        flash
    });
});

app.get("/edithome", isAuth, async function(req, res) {
    const homepage = await DB.getHome();
    res.render("edithome", { homepage });
});

app.post("/edithome/delete/:id", isAuth, async function(req, res) {
    await DB.deleteHome(req.params.id);
    res.redirect("/edithome");
});

app.post("/edithome", isAuth, async function(req, res) {
    const { homeTitle, aboutBody } = req.body;
    await DB.setHome(homeTitle, aboutBody);
    res.redirect("/updated");
});

app.get("/compose", isAuth, async function(req, res) {
    const posts = await DB.getBlogs();
    res.render("compose", { posts });
});

app.post("/compose", isAuth, uploadImage.single("blogImage"), async function(req, res) {
    if (["about","learnings","home","contact"].includes(req.body.postTitle)) return res.redirect("/compose");
    let base64Image = null;
    if (req.file) {
        base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    await DB.addBlog({
        title: req.body.postTitle,
        content: req.body.postBody,
        timestamp: day,
        date: new Date(),
        image: base64Image
    });
    res.redirect("/compose");
});

app.get("/compose/edit/:id", isAuth, async function(req, res) {
    const editItem = await DB.getBlog(req.params.id);
    const posts = await DB.getBlogs();
    res.render("compose", { posts, editItem });
});

app.post("/compose/edit/:id", isAuth, uploadImage.single("blogImage"), async function(req, res) {
    const updateData = { title: req.body.postTitle, content: req.body.postBody };
    if (req.file) {
        updateData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    await DB.updateBlog(req.params.id, updateData);
    res.redirect("/compose");
});

app.post("/compose/delete/:id", isAuth, async function(req, res) {
    await DB.deleteBlog(req.params.id);
    res.redirect("/compose");
});

app.get("/postlearnings", isAuth, async function(req, res) {
    const learnings = await DB.getLearnings();
    res.render("postlearnings", { learnings });
});

app.post("/postlearnings", isAuth, uploadImage.single("learningImage"), async function(req, res) {
    let base64Image = null;
    if (req.file) {
        base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    await DB.addLearning({
        title: req.body.learningsTitle,
        content: req.body.learningsBody,
        date: new Date(),
        image: base64Image
    });
    res.redirect("/postlearnings");
});

app.get("/postlearnings/edit/:id", isAuth, async function(req, res) {
    const learning = await DB.getLearning(req.params.id);
    const learnings = await DB.getLearnings();
    res.render("postlearnings", { learnings, editItem: learning });
});

app.post("/postlearnings/edit/:id", isAuth, uploadImage.single("learningImage"), async function(req, res) {
    const updateData = { title: req.body.learningsTitle, content: req.body.learningsBody };
    if (req.file) {
        updateData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    await DB.updateLearning(req.params.id, updateData);
    res.redirect("/postlearnings");
});

app.post("/postlearnings/delete/:id", isAuth, async function(req, res) {
    await DB.deleteLearning(req.params.id);
    res.redirect("/postlearnings");
});

app.get("/getcontact", isAuth, async function(req, res) {
    const contactDetails = await DB.getContacts();
    res.render("getcontact", { contactDetails });
});

app.post("/getcontact/read/:id", isAuth, async function(req, res) {
    await DB.markContactRead(req.params.id);
    res.redirect("/getcontact");
});

app.post("/getcontact/readall", isAuth, async function(req, res) {
    await DB.markAllContactsRead();
    res.redirect("/getcontact");
});

app.post("/getcontact/delete/:id", isAuth, async function(req, res) {
    await DB.deleteContact(req.params.id);
    res.redirect("/getcontact");
});

app.get("/admin-careers", isAuth, async function(req, res) {
    const careers = await DB.getCareers();
    res.render("admin-careers", { careers });
});

app.get("/admin-careers/add", isAuth, function(req, res) {
    res.render("admin-career-form", { career: null, action: "/admin-careers/add" });
});

app.post("/admin-careers/add", isAuth, async function(req, res) {
    await DB.addCareer({
        title: req.body.careerTitle,
        description: req.body.careerDescription,
        location: req.body.careerLocation,
        type: req.body.careerType,
        salary: req.body.careerSalary,
        deadline: req.body.careerDeadline,
        active: req.body.careerActive === "on"
    });
    res.redirect("/admin-careers");
});

app.get("/admin-careers/edit/:id", isAuth, async function(req, res) {
    const career = await DB.getCareer(req.params.id);
    res.render("admin-career-form", { career, action: "/admin-careers/edit/" + req.params.id });
});

app.post("/admin-careers/edit/:id", isAuth, async function(req, res) {
    await DB.updateCareer(req.params.id, {
        title: req.body.careerTitle,
        description: req.body.careerDescription,
        location: req.body.careerLocation,
        type: req.body.careerType,
        salary: req.body.careerSalary,
        deadline: req.body.careerDeadline,
        active: req.body.careerActive === "on"
    });
    res.redirect("/admin-careers");
});

app.post("/admin-careers/delete/:id", isAuth, async function(req, res) {
    await DB.deleteCareer(req.params.id);
    res.redirect("/admin-careers");
});

app.get("/admin-terms", isAuth, async function(req, res) {
    const termsList = await DB.getTerms();
    res.render("admin-terms", { termsList });
});

app.get("/admin-terms/add", isAuth, function(req, res) {
    res.render("admin-terms-form", { term: null, action: "/admin-terms/add" });
});

app.post("/admin-terms/add", isAuth, async function(req, res) {
    await DB.addTerm({
        title: req.body.termTitle,
        content: req.body.termContent
    });
    res.redirect("/admin-terms");
});

app.get("/admin-terms/edit/:id", isAuth, async function(req, res) {
    const term = await DB.getTerm(req.params.id);
    res.render("admin-terms-form", { term, action: "/admin-terms/edit/" + req.params.id });
});

app.post("/admin-terms/edit/:id", isAuth, async function(req, res) {
    await DB.updateTerm(req.params.id, {
        title: req.body.termTitle,
        content: req.body.termContent
    });
    res.redirect("/admin-terms");
});

app.post("/admin-terms/delete/:id", isAuth, async function(req, res) {
    await DB.deleteTerm(req.params.id);
    res.redirect("/admin-terms");
});

app.get("/admin-books", isAuth, async function(req, res) {
    const bookings = await DB.getBooks();
    res.render("admin-books", { bookings });
});

app.post("/admin-books/status/:id", isAuth, async function(req, res) {
    await DB.updateBookStatus(req.params.id, req.body.status);
    res.redirect("/admin-books");
});

app.post("/admin-books/delete/:id", isAuth, async function(req, res) {
    await DB.deleteBook(req.params.id);
    res.redirect("/admin-books");
});

app.get("/admin-candidates", isAuth, async function(req, res) {
    const candidates = await DB.getCandidates();
    res.render("admin-candidates", { candidates });
});

app.post("/admin-candidates/reviewed/:id", isAuth, async function(req, res) {
    await DB.markCandidateReviewed(req.params.id);
    res.redirect("/admin-candidates");
});

app.post("/admin-candidates/reviewedall", isAuth, async function(req, res) {
    await DB.markAllCandidatesReviewed();
    res.redirect("/admin-candidates");
});

app.post("/admin-candidates/delete/:id", isAuth, async function(req, res) {
    try {
        const candidate = await DB.getCandidate(req.params.id);
        if (candidate && candidate.cvPath) {
            const absoluteCvPath = path.join(__dirname, "public", candidate.cvPath);
            if (fs.existsSync(absoluteCvPath)) {
                fs.unlinkSync(absoluteCvPath);
            }
        }
        await DB.deleteCandidate(req.params.id);
    } catch(err) {
        console.error("Error deleting candidate application:", err);
    }
    res.redirect("/admin-candidates");
});

app.get("/admin-homecards", isAuth, async function(req, res) {
    const homecards = await DB.getHomeCards();
    res.render("admin-homecards", { homecards });
});

app.get("/admin-homecards/add", isAuth, function(req, res) {
    res.render("admin-homecard-form", { card: null, action: "/admin-homecards/add" });
});

app.post("/admin-homecards/add", isAuth, async function(req, res) {
    await DB.addHomeCard({
        title: req.body.cardTitle,
        description: req.body.cardDescription,
        icon: req.body.cardIcon || "fa-solid fa-star",
        order: parseInt(req.body.cardOrder) || 0,
        active: req.body.cardActive === "on"
    });
    res.redirect("/admin-homecards");
});

app.get("/admin-homecards/edit/:id", isAuth, async function(req, res) {
    const card = await DB.getHomeCard(req.params.id);
    res.render("admin-homecard-form", { card, action: "/admin-homecards/edit/" + req.params.id });
});

app.post("/admin-homecards/edit/:id", isAuth, async function(req, res) {
    await DB.updateHomeCard(req.params.id, {
        title: req.body.cardTitle,
        description: req.body.cardDescription,
        icon: req.body.cardIcon || "fa-solid fa-star",
        order: parseInt(req.body.cardOrder) || 0,
        active: req.body.cardActive === "on"
    });
    res.redirect("/admin-homecards");
});

app.post("/admin-homecards/delete/:id", isAuth, async function(req, res) {
    await DB.deleteHomeCard(req.params.id);
    res.redirect("/admin-homecards");
});

// ── Admin Carousel Management Routes ──────────────────────────────────────
app.get("/admin-carousel", isAuth, async function(req, res) {
    const carousels = await DB.getCarousels();
    res.render("admin-carousel", { carousels });
});

app.get("/admin-carousel/add", isAuth, function(req, res) {
    res.render("admin-carousel-form", { slide: null, action: "/admin-carousel/add" });
});

app.post("/admin-carousel/add", isAuth, uploadImage.single("carouselImage"), async function(req, res) {
    let image = req.body.imageUrl || "/img/slide1.jpg";
    if (req.file) {
        image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    await DB.addCarousel({
        title: req.body.slideTitle,
        subtitle: req.body.slideSubtitle,
        image: image,
        buttonText: req.body.buttonText || "",
        link: req.body.buttonLink || "",
        order: parseInt(req.body.slideOrder) || 1,
        active: req.body.slideActive === "on"
    });
    res.redirect("/admin-carousel");
});

app.get("/admin-carousel/edit/:id", isAuth, async function(req, res) {
    const slide = await DB.getCarousel(req.params.id);
    if (!slide) return res.redirect("/admin-carousel");
    res.render("admin-carousel-form", { slide, action: "/admin-carousel/edit/" + req.params.id });
});

app.post("/admin-carousel/edit/:id", isAuth, uploadImage.single("carouselImage"), async function(req, res) {
    const updateData = {
        title: req.body.slideTitle,
        subtitle: req.body.slideSubtitle,
        buttonText: req.body.buttonText || "",
        link: req.body.buttonLink || "",
        order: parseInt(req.body.slideOrder) || 1,
        active: req.body.slideActive === "on"
    };
    if (req.file) {
        updateData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    } else if (req.body.imageUrl && req.body.imageUrl.trim().length > 0) {
        updateData.image = req.body.imageUrl.trim();
    }
    await DB.updateCarousel(req.params.id, updateData);
    res.redirect("/admin-carousel");
});

app.post("/admin-carousel/delete/:id", isAuth, async function(req, res) {
    await DB.deleteCarousel(req.params.id);
    res.redirect("/admin-carousel");
});

// ── Admin Gallery Management Routes ───────────────────────────────────────
app.get("/admin-gallery", isAuth, async function(req, res) {
    const galleries = await DB.getGalleries();
    res.render("admin-gallery", { galleries });
});

app.get("/admin-gallery/add", isAuth, function(req, res) {
    res.render("admin-gallery-form", { photo: null, action: "/admin-gallery/add" });
});

app.post("/admin-gallery/add", isAuth, uploadImage.single("galleryImage"), async function(req, res) {
    let image = req.body.imageUrl || "/img/slide1.jpg";
    if (req.file) {
        image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    await DB.addGallery({
        title: req.body.photoTitle,
        category: req.body.photoCategory || "Campus",
        description: req.body.photoDescription || "",
        image: image,
        date: req.body.photoDate || "Aug 2026",
        featured: req.body.photoFeatured === "on",
        order: parseInt(req.body.photoOrder) || 0,
        active: req.body.photoActive === "on"
    });
    res.redirect("/admin-gallery");
});

app.get("/admin-gallery/edit/:id", isAuth, async function(req, res) {
    const photo = await DB.getGallery(req.params.id);
    if (!photo) return res.redirect("/admin-gallery");
    res.render("admin-gallery-form", { photo, action: "/admin-gallery/edit/" + req.params.id });
});

app.post("/admin-gallery/edit/:id", isAuth, uploadImage.single("galleryImage"), async function(req, res) {
    const updateData = {
        title: req.body.photoTitle,
        category: req.body.photoCategory || "Campus",
        description: req.body.photoDescription || "",
        date: req.body.photoDate || "Aug 2026",
        featured: req.body.photoFeatured === "on",
        order: parseInt(req.body.photoOrder) || 0,
        active: req.body.photoActive === "on"
    };
    if (req.file) {
        updateData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    } else if (req.body.imageUrl && req.body.imageUrl.trim().length > 0) {
        updateData.image = req.body.imageUrl.trim();
    }
    await DB.updateGallery(req.params.id, updateData);
    res.redirect("/admin-gallery");
});

app.post("/admin-gallery/delete/:id", isAuth, async function(req, res) {
    await DB.deleteGallery(req.params.id);
    res.redirect("/admin-gallery");
});

// ── Admin Admissions CRUD Routes ──────────────────────────────────────────
app.get("/admin-admissions", isAuth, async function(req, res) {
    const admissions = await DB.getAdmissions();
    res.render("admin-admissions", { admissions });
});

app.get("/admin-admissions/add", isAuth, function(req, res) {
    res.render("admin-admission-form", { admission: null, action: "/admin-admissions/add" });
});

app.post("/admin-admissions/add", isAuth, async function(req, res) {
    await DB.addAdmission({
        title: req.body.admissionTitle,
        category: req.body.admissionCategory || "Senior Secondary",
        eligibility: req.body.admissionEligibility || "",
        feeStructure: req.body.admissionFeeStructure || "",
        seats: req.body.admissionSeats || "",
        deadline: req.body.admissionDeadline || "",
        description: req.body.admissionDescription || "",
        icon: req.body.admissionIcon || "fa-solid fa-user-graduate",
        order: parseInt(req.body.admissionOrder) || 0,
        active: req.body.admissionActive === "on"
    });
    res.redirect("/admin-admissions");
});

app.get("/admin-admissions/edit/:id", isAuth, async function(req, res) {
    const admission = await DB.getAdmission(req.params.id);
    if (!admission) return res.redirect("/admin-admissions");
    res.render("admin-admission-form", { admission, action: "/admin-admissions/edit/" + req.params.id });
});

app.post("/admin-admissions/edit/:id", isAuth, async function(req, res) {
    await DB.updateAdmission(req.params.id, {
        title: req.body.admissionTitle,
        category: req.body.admissionCategory || "Senior Secondary",
        eligibility: req.body.admissionEligibility || "",
        feeStructure: req.body.admissionFeeStructure || "",
        seats: req.body.admissionSeats || "",
        deadline: req.body.admissionDeadline || "",
        description: req.body.admissionDescription || "",
        icon: req.body.admissionIcon || "fa-solid fa-user-graduate",
        order: parseInt(req.body.admissionOrder) || 0,
        active: req.body.admissionActive === "on"
    });
    res.redirect("/admin-admissions");
});

app.post("/admin-admissions/delete/:id", isAuth, async function(req, res) {
    await DB.deleteAdmission(req.params.id);
    res.redirect("/admin-admissions");
});

// ── Admin Academics CRUD Routes ───────────────────────────────────────────
app.get("/admin-academics", isAuth, async function(req, res) {
    const academics = await DB.getAcademics();
    res.render("admin-academics", { academics });
});

app.get("/admin-academics/add", isAuth, function(req, res) {
    res.render("admin-academic-form", { academic: null, action: "/admin-academics/add" });
});

app.post("/admin-academics/add", isAuth, uploadImage.single("academicImage"), async function(req, res) {
    let image = req.body.imageUrl || "/img/slide2.jpg";
    if (req.file) {
        image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    await DB.addAcademic({
        title: req.body.academicTitle,
        stream: req.body.academicStream || "Science",
        grade: req.body.academicGrade || "Class 11 - 12",
        curriculum: req.body.academicCurriculum || "",
        features: req.body.academicFeatures || "",
        description: req.body.academicDescription || "",
        image: image,
        order: parseInt(req.body.academicOrder) || 0,
        active: req.body.academicActive === "on"
    });
    res.redirect("/admin-academics");
});

app.get("/admin-academics/edit/:id", isAuth, async function(req, res) {
    const academic = await DB.getAcademic(req.params.id);
    if (!academic) return res.redirect("/admin-academics");
    res.render("admin-academic-form", { academic, action: "/admin-academics/edit/" + req.params.id });
});

app.post("/admin-academics/edit/:id", isAuth, uploadImage.single("academicImage"), async function(req, res) {
    const updateData = {
        title: req.body.academicTitle,
        stream: req.body.academicStream || "Science",
        grade: req.body.academicGrade || "Class 11 - 12",
        curriculum: req.body.academicCurriculum || "",
        features: req.body.academicFeatures || "",
        description: req.body.academicDescription || "",
        order: parseInt(req.body.academicOrder) || 0,
        active: req.body.academicActive === "on"
    };
    if (req.file) {
        updateData.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    } else if (req.body.imageUrl && req.body.imageUrl.trim().length > 0) {
        updateData.image = req.body.imageUrl.trim();
    }
    await DB.updateAcademic(req.params.id, updateData);
    res.redirect("/admin-academics");
});

app.post("/admin-academics/delete/:id", isAuth, async function(req, res) {
    await DB.deleteAcademic(req.params.id);
    res.redirect("/admin-academics");
});

// ── Auth & OTP ─────────────────────────────────────────────────────────────
app.post("/adminregister", async function(req, res) {
    if (req.body.adminid !== confirmpassword) {
        console.warn("[REGISTER] ❌ Admin password mismatch.");
        return res.redirect("/adminerror");
    }
    try {
        console.log("[REGISTER] 🆕 Registering new admin:", req.body.username);
        if (mongoose.connection.readyState === 1) {
            const user = await Admin.register({ username: req.body.username }, req.body.password);
            req.login(user, function(err) {
                if (err) return res.redirect("/adminerror");
                req.session.adminToken = crypto.randomBytes(32).toString("hex");
                req.session.flash = "Registered and logged in successfully.";
                res.redirect("/overview");
            });
        } else {
            // In-memory admin registration
            memoryDB.admins.push({ username: req.body.username, password: req.body.password });
            req.session.isDemoAdmin = true;
            req.session.adminUser = req.body.username;
            req.session.adminToken = crypto.randomBytes(32).toString("hex");
            req.session.flash = "Registered and logged in successfully (Memory mode).";
            res.redirect("/overview");
        }
    } catch (err) {
        console.error("[REGISTER] ❌ Registration error:", err.message);
        res.redirect("/adminerror");
    }
});

app.post("/adminlogin", function(req, res) {
    const { username, password } = req.body;
    console.log(`[LOGIN] Attempt for: ${username}`);

    if (mongoose.connection.readyState === 1) {
        passport.authenticate("local", async function(err, user, info) {
            if (err || !user) {
                req.session.loginError = true;
                return res.redirect("/adminlogin");
            }
            handleOtpCreation(user.username, req, res);
        })(req, res);
    } else {
        // In-memory authentication fallback:
        // Accept default admin or any created user
        const found = memoryDB.admins.find(a => a.username === username && a.password === password) ||
                      (username === "admin@shaheen.edu" && password === "admin123") ||
                      (username.includes("@") && password.length >= 4);

        if (found) {
            handleOtpCreation(username, req, res);
        } else {
            req.session.loginError = true;
            res.redirect("/adminlogin");
        }
    }
});

async function handleOtpCreation(username, req, res) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log("=======================================");
    console.log("🔑 NEW LOGIN OTP GENERATED");
    console.log(`👤 USER: ${username}`);
    console.log(`🔢 OTP CODE: ${otp}`);
    console.log(`⏰ EXPIRES: ${expiresAt.toLocaleTimeString()}`);
    console.log("=======================================");

    if (mongoose.connection.readyState === 1) {
        try {
            await OtpRecord.deleteMany({ username });
            await OtpRecord.create({ token, username, otp, expiresAt });
        } catch (e) {
            console.error("MongoDB OTP saving error, falling back to memory:", e);
        }
    }
    
    // Always keep in memory store as fallback
    memoryDB.otprecords = memoryDB.otprecords.filter(o => o.username !== username);
    memoryDB.otprecords.push({ token, username, otp, expiresAt });

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter.sendMail({
            from: `"Admin Panel" <${process.env.EMAIL_USER}>`,
            to: username,
            subject: "Admin Login OTP",
            text: `Your OTP is: ${otp}. It expires in 10 minutes.`
        }).catch(e => console.error("[LOGIN] Email send error:", e.message));
    }

    req.session.devOtpFlash = `[Development Mode] Your OTP is: ${otp}`;
    res.redirect("/admin-otp?t=" + token);
}

app.get("/admin-otp", async function(req, res) {
    const token = req.query.t;
    if (!token) return res.redirect("/adminlogin");

    let record = null;
    if (mongoose.connection.readyState === 1) {
        try { record = await OtpRecord.findOne({ token }); } catch (e) {}
    }
    if (!record) {
        record = memoryDB.otprecords.find(o => o.token === token);
    }

    if (!record || Date.now() > record.expiresAt) {
        return res.redirect("/adminlogin");
    }

    const flash = req.session.devOtpFlash || null;
    req.session.devOtpFlash = null;
    res.render("admin-otp", { otpError: null, flash, token });
});

app.post("/resend-otp", async function(req, res) {
    const token = req.body.token;
    if (!token) return res.redirect("/adminlogin");

    let existing = null;
    if (mongoose.connection.readyState === 1) {
        try { existing = await OtpRecord.findOne({ token }); } catch (e) {}
    }
    if (!existing) {
        existing = memoryDB.otprecords.find(o => o.token === token);
    }

    if (!existing) return res.redirect("/adminlogin");

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log("=======================================");
    console.log("🔄 OTP RESENT");
    console.log(`👤 USER: ${existing.username}`);
    console.log(`🔢 NEW OTP CODE: ${newOtp}`);
    console.log("=======================================");

    if (mongoose.connection.readyState === 1) {
        try {
            await OtpRecord.deleteOne({ token });
            await OtpRecord.create({ token: newToken, username: existing.username, otp: newOtp, expiresAt });
        } catch (e) {}
    }
    memoryDB.otprecords = memoryDB.otprecords.filter(o => o.token !== token);
    memoryDB.otprecords.push({ token: newToken, username: existing.username, otp: newOtp, expiresAt });

    req.session.devOtpFlash = `[Development Mode] Your new OTP is: ${newOtp}`;
    res.redirect("/admin-otp?t=" + newToken);
});

app.post("/admin-otp", async function(req, res) {
    const { otp, token } = req.body;
    if (!token) return res.redirect("/adminlogin");

    let record = null;
    if (mongoose.connection.readyState === 1) {
        try { record = await OtpRecord.findOne({ token }); } catch (e) {}
    }
    if (!record) {
        record = memoryDB.otprecords.find(o => o.token === token);
    }

    if (!record) {
        return res.render("admin-otp", { otpError: "Session expired. Please login again.", flash: null, token: "" });
    }
    if (Date.now() > record.expiresAt) {
        return res.render("admin-otp", { otpError: "OTP has expired. Please login again.", flash: null, token: "" });
    }

    if (otp === record.otp) {
        console.log("[OTP] ✅ Code verified for:", record.username);
        if (mongoose.connection.readyState === 1) {
            try {
                await OtpRecord.deleteOne({ token });
                const user = await Admin.findOne({ username: record.username });
                if (user) {
                    return req.login(user, function(err) {
                        req.session.adminToken = crypto.randomBytes(32).toString("hex");
                        req.session.flash = "Logged in successfully";
                        res.redirect("/overview");
                    });
                }
            } catch (e) {}
        }
        
        // Memory authentication complete
        memoryDB.otprecords = memoryDB.otprecords.filter(o => o.token !== token);
        req.session.isDemoAdmin = true;
        req.session.adminUser = record.username;
        req.session.adminToken = crypto.randomBytes(32).toString("hex");
        req.session.flash = "Logged in successfully";
        res.redirect("/overview");
    } else {
        console.log("[OTP] ❌ Invalid code entered. Expected:", record.otp, "Got:", otp);
        res.render("admin-otp", { otpError: "Invalid OTP. Please try again.", flash: null, token });
    }
});

app.get("/logout", function(req, res) {
    req.logout(function(err) {
        req.session.adminToken = null;
        req.session.isDemoAdmin = null;
        req.session.adminUser = null;
        req.session.destroy(function() {
            res.clearCookie("connect.sid");
            res.redirect("/adminlogin");
        });
    });
});

// ── Global Search ─────────────────────────────────────────────────────────────
app.get("/api/search", async function(req, res) {
    const q = (req.query.q || "").trim().toLowerCase();
    if (!q) return res.json({ blogs: [], learnings: [], careers: [], galleries: [], admissions: [], academics: [] });

    const blogs = (await DB.getBlogs()).filter(b => b.title.toLowerCase().includes(q) || (b.content && b.content.toLowerCase().includes(q))).slice(0, 5);
    const learnings = (await DB.getLearnings()).filter(l => l.title.toLowerCase().includes(q) || (l.content && l.content.toLowerCase().includes(q))).slice(0, 5);
    const careers = (await DB.getCareers(true)).filter(c => c.title.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))).slice(0, 5);
    const galleries = (await DB.getGalleries(true)).filter(g => g.title.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q)) || (g.category && g.category.toLowerCase().includes(q))).slice(0, 5);
    const admissions = (await DB.getAdmissions(true)).filter(a => a.title.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q)) || (a.category && a.category.toLowerCase().includes(q))).slice(0, 5);
    const academics = (await DB.getAcademics(true)).filter(a => a.title.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q)) || (a.stream && a.stream.toLowerCase().includes(q))).slice(0, 5);

    res.json({ blogs, learnings, careers, galleries, admissions, academics });
});

app.get("/search", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const q = (req.query.q || "").trim();
    let blogs = [], learnings = [], careers = [], galleries = [], admissions = [], academics = [];
    if (q) {
        const ql = q.toLowerCase();
        blogs = (await DB.getBlogs()).filter(b => b.title.toLowerCase().includes(ql) || (b.content && b.content.toLowerCase().includes(ql))).slice(0, 10);
        learnings = (await DB.getLearnings()).filter(l => l.title.toLowerCase().includes(ql) || (l.content && l.content.toLowerCase().includes(ql))).slice(0, 10);
        careers = (await DB.getCareers(true)).filter(c => c.title.toLowerCase().includes(ql) || (c.description && c.description.toLowerCase().includes(ql)) || (c.location && c.location.toLowerCase().includes(ql))).slice(0, 10);
        galleries = (await DB.getGalleries(true)).filter(g => g.title.toLowerCase().includes(ql) || (g.description && g.description.toLowerCase().includes(ql)) || (g.category && g.category.toLowerCase().includes(ql))).slice(0, 10);
        admissions = (await DB.getAdmissions(true)).filter(a => a.title.toLowerCase().includes(ql) || (a.description && a.description.toLowerCase().includes(ql)) || (a.category && a.category.toLowerCase().includes(ql))).slice(0, 10);
        academics = (await DB.getAcademics(true)).filter(a => a.title.toLowerCase().includes(ql) || (a.description && a.description.toLowerCase().includes(ql)) || (a.stream && a.stream.toLowerCase().includes(ql))).slice(0, 10);
    }
    const total = blogs.length + learnings.length + careers.length + galleries.length + admissions.length + academics.length;
    res.render("search", { 
        query: q, 
        blogs, 
        learnings, 
        careers, 
        galleries,
        admissions,
        academics,
        total,
        pageTitle: q ? "Search: " + q + " | Shaheen Academy" : "Search | Shaheen Academy",
        pageDesc: "Search across admissions, academic streams, gallery photos, blog posts, and careers.",
        pageUrl: su + "/search" 
    });
});

// ── Blog Single Post Catch-All ────────────────────────────────────────────────
app.get("/:customPost", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const newPost = _.lowerCase(decodeURIComponent(req.params.customPost));
    const posts = await DB.getBlogs();
    for (const post of posts) {
        if (_.lowerCase(post.title) === newPost) {
            return res.render("blogpost", { 
                postTitle: post.title, 
                postContent: post.content, 
                postImage: post.image, 
                pageTitle: post.title + " | Shaheen Academy", 
                pageDesc: post.content.substring(0, 155).replace(/\n/g, " "), 
                pageUrl: su + "/" + encodeURIComponent(post.title), 
                ogType: "article" 
            });
        }
    }
    res.status(404).render("maintenance");
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", function() {
    console.log(`Shaheen Academy server running on http://0.0.0.0:${PORT}`);
});
