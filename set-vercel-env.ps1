# Set Vercel Environment Variables
Write-Host "Setting Vercel environment variables..." -ForegroundColor Green

# Set VITE_SUPABASE_URL
$supabaseUrl = "https://stxcnjusciiwqebvrboq.supabase.co"
echo $supabaseUrl | vercel env add VITE_SUPABASE_URL --environment production

# Set VITE_SUPABASE_ANON_KEY
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0eGNuanVzY2lpd3FlYnZyYm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzY1ODAsImV4cCI6MjA5ODExMjU4MH0.tPJDgc6jP4-28lZByKsiv7nNzHISsRUwR1SY2JvdGSg"
echo $supabaseKey | vercel env add VITE_SUPABASE_ANON_KEY --environment production

Write-Host "Environment variables set successfully!" -ForegroundColor Green
Write-Host "Now redeploy with: vercel --prod" -ForegroundColor Yellow
