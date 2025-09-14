const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CONFIG = {
  prompt: "Create a calming ambient track with gentle synthesizers and peaceful melodies",
  tags: "ambient, calm, relaxing, peaceful",
  makeInstrumental: false
};

// Helper function to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test the generate-music endpoint
async function testGenerateMusic() {
  console.log('🎵 Testing music generation...');

  try {
    const response = await fetch(`${BASE_URL}/api/generate-music`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_CONFIG),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Generate Music Response:', JSON.stringify(data, null, 2));

    if (data.success && data.clips && data.clips.length > 0) {
      return data.clips.map(clip => clip.id);
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('❌ Generate Music Error:', error.message);
    return null;
  }
}

// Test the check-status endpoint
async function testCheckStatus(clipIds) {
  console.log('\n📊 Testing status check...');

  try {
    const response = await fetch(`${BASE_URL}/api/check-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clipIds }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Check Status Response:', JSON.stringify(data, null, 2));

    return data.clips || [];
  } catch (error) {
    console.error('❌ Check Status Error:', error.message);
    return [];
  }
}

// Test the polling mechanism
async function testPollingFlow(clipIds, maxAttempts = 10) {
  console.log('\n🔄 Testing polling flow...');
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\nAttempt ${attempts}/${maxAttempts}`);

    const clips = await testCheckStatus(clipIds);

    if (clips.length === 0) {
      console.log('⚠️  No clips returned, retrying...');
      await sleep(5000);
      continue;
    }

    const completedClips = clips.filter(clip => clip.status === 'complete' && clip.audio_url);
    const errorClips = clips.filter(clip => clip.status === 'error');

    console.log(`📈 Status Summary:`);
    console.log(`   - Total clips: ${clips.length}`);
    console.log(`   - Completed: ${completedClips.length}`);
    console.log(`   - Error: ${errorClips.length}`);
    console.log(`   - In progress: ${clips.length - completedClips.length - errorClips.length}`);

    if (completedClips.length > 0) {
      console.log('\n🎉 SUCCESS! Found completed clips:');
      completedClips.forEach(clip => {
        console.log(`   - ${clip.title || 'Untitled'} (${clip.audio_url})`);
      });
      return completedClips;
    }

    if (errorClips.length === clips.length) {
      console.log('\n❌ All clips failed:');
      errorClips.forEach(clip => {
        console.log(`   - Error: ${clip.metadata?.error_message || 'Unknown error'}`);
      });
      return [];
    }

    console.log(`⏳ Waiting 5 seconds before next check...`);
    await sleep(5000);
  }

  console.log('\n⏰ Polling timed out after maximum attempts');
  return [];
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Suno API Integration Tests\n');
  console.log('Configuration:');
  console.log(`   - Base URL: ${BASE_URL}`);
  console.log(`   - Prompt: "${TEST_CONFIG.prompt}"`);
  console.log(`   - Tags: ${TEST_CONFIG.tags}`);
  console.log(`   - Instrumental: ${TEST_CONFIG.makeInstrumental}\n`);

  // Step 1: Test music generation
  const clipIds = await testGenerateMusic();

  if (!clipIds || clipIds.length === 0) {
    console.log('\n❌ Test failed: Could not generate music');
    process.exit(1);
  }

  console.log(`\n✅ Generated ${clipIds.length} clip(s) with IDs: ${clipIds.join(', ')}`);

  // Step 2: Test polling until completion
  const completedClips = await testPollingFlow(clipIds);

  if (completedClips.length > 0) {
    console.log('\n🎊 ALL TESTS PASSED!');
    console.log('\nSummary:');
    console.log(`   - Generated clips: ${clipIds.length}`);
    console.log(`   - Completed clips: ${completedClips.length}`);
    console.log('\nThe Suno API integration is working correctly! 🎵');
  } else {
    console.log('\n❌ Tests completed but no clips were successfully generated');
    process.exit(1);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Check if we're running this script directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testGenerateMusic, testCheckStatus, testPollingFlow };
