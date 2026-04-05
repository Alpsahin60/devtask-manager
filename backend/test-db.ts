import 'dotenv/config';
import mongoose from 'mongoose';

const testConnection = async () => {
  console.log('🔍 Testing MongoDB connection...');
  console.log('📍 Connection URI:', process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ MongoDB connection successful!');
    console.log('📄 Database name:', mongoose.connection.db.databaseName);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📂 Available collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.log('❌ MongoDB connection failed:');
    console.log(error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Possible solutions:');
      console.log('1. Install and start local MongoDB server');
      console.log('2. Use MongoDB Atlas (cloud) - see MONGODB_SETUP.md');
      console.log('3. Check your MONGODB_URI in .env file');
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  }
};

testConnection();