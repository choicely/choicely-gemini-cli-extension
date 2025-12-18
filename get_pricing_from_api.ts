#!/usr/bin/env tsx

import https from 'https'

// Types based on the backend
interface UserTier {
  unitAmountDecimal: string
  unitAmountMicroCents: number
  upTo?: number
}

interface Sku {
  currency: string
  description: string
  interval: 'quarter' | 'year'
  name: string
  price: number
  skuType: string
  title: string
  skuId: string
  userTiers: UserTier[]
  priceMonthly: number
}

interface ApiResponse {
  data: Sku[]
}

// Calculate monthly cost based on user tiers
function calculateMonthlyCost({
  monthlyUsers,
  priceMonthly,
  userTiers
}: {
  monthlyUsers: number
  priceMonthly: number
  userTiers: UserTier[]
}): number {
  let totalCost = priceMonthly // Start with the base price
  const freeUsers = userTiers?.[0].upTo || 0

  if (monthlyUsers <= freeUsers) return totalCost // Free users
  let previousTierUpTo = freeUsers

  for (const tier of userTiers) {
    const currentTierUpTo = tier.upTo || Infinity // Use Infinity for the last tier

    if (monthlyUsers > previousTierUpTo) {
      // Calculate the number of users in the current tier
      const usersInTier =
        Math.min(monthlyUsers, currentTierUpTo) - previousTierUpTo

      // Add the cost for these users to the total cost
      totalCost += usersInTier * parseFloat(tier.unitAmountDecimal)
    }

    previousTierUpTo = currentTierUpTo

    if (monthlyUsers <= currentTierUpTo) {
      break // Stop if we've processed the appropriate tier
    }
  }

  return totalCost
}

// Format price in euros with proper formatting
function formatPrice(priceInCents: number): string {
  return `€${(priceInCents / 100).toFixed(2).replace('.', ',')}`
}

// Format large numbers with spaces
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Get recommended tier for MAU count
function getRecommendedTier(skus: Sku[], mau: number): { sku: Sku; monthlyCost: number } | null {
  // Filter quarterly SKUs and sort by base price
  const quarterlySkus = skus
    .filter(sku => sku.interval === 'quarter')
    .sort((a, b) => a.priceMonthly - b.priceMonthly)

  // Find the most suitable tier
  for (const sku of quarterlySkus) {
    const freeUsers = sku.userTiers[0]?.upTo || 0
    if (mau <= freeUsers) {
      // User fits in base tier
      return { sku, monthlyCost: sku.priceMonthly }
    }

    // Calculate cost with overage
    const cost = calculateMonthlyCost({
      monthlyUsers: mau,
      priceMonthly: sku.priceMonthly,
      userTiers: sku.userTiers
    })

    // If this is the last tier or MAU is within reasonable range, recommend it
    if (!sku.userTiers[sku.userTiers.length - 1]?.upTo || mau <= (sku.userTiers[sku.userTiers.length - 1]?.upTo || Infinity)) {
      return { sku, monthlyCost: cost }
    }
  }

  return null
}

// Display pricing table
function displayPricingTable(skus: Sku[], mau?: number): void {
  console.log('🚀 **Choicely Studio Premium Pricing**\n')
  console.log('Choicely Studio Premium is calculated by Monthly Active Users (MAU).')
  console.log('All prices are in EUR (excluding VAT where applicable).\n')

  // Group by tier type and sort
  const quarterlySkus = skus
    .filter(sku => sku.interval === 'quarter')
    .sort((a, b) => a.priceMonthly - b.priceMonthly)

  if (quarterlySkus.length === 0) {
    console.log('No pricing data available.')
    return
  }

  console.log('**Available Tiers (Quarterly Billing):**\n')

  quarterlySkus.forEach((sku, index) => {
    const tierNumber = index + 1
    const freeUsers = sku.userTiers[0]?.upTo || 0

    console.log(`**Tier ${tierNumber}: ${sku.title}**`)
    console.log(`Base Price: ${formatPrice(sku.priceMonthly)}/month`)
    console.log(`Included MAU: ${formatNumber(freeUsers)}`)

    if (sku.userTiers.length > 1) {
      console.log('Overage Pricing:')
      sku.userTiers.slice(1).forEach(tier => {
        const upTo = tier.upTo ? formatNumber(tier.upTo) : '∞'
        console.log(`  ${formatNumber((tier.upTo || freeUsers))} - ${upTo} MAU: +${tier.unitAmountDecimal}€/user`)
      })
    }

    console.log('')
  })

  // Show yearly discount info
  console.log('💰 **Save 40% with Annual Billing!**\n')

  // If MAU specified, show recommendation
  if (mau) {
    const recommendation = getRecommendedTier(skus, mau)
    if (recommendation) {
      console.log(`🎯 **Recommendation for ${formatNumber(mau)} MAU:**`)
      console.log(`Best Tier: ${recommendation.sku.title}`)
      console.log(`Monthly Cost: ${formatPrice(recommendation.monthlyCost)}`)
      console.log(`(Based on quarterly billing)\n`)
    }
  }

  console.log('📞 **Need Enterprise pricing?** Contact us for custom solutions!')
  console.log('🌐 Visit [choicely.com](https://choicely.com) for more details.\n')
}

// Mock pricing data based on the test specifications
function getMockPricingData(): Sku[] {
  return [
    {
      currency: 'eur',
      description: 'Micro tier - perfect for small projects',
      interval: 'quarter',
      name: 'Micro',
      price: 33200, // €332 in cents
      skuType: 'micro',
      title: 'Micro',
      skuId: 'micro_quarterly',
      priceMonthly: 33200,
      userTiers: [
        { unitAmountDecimal: '0', unitAmountMicroCents: 0, upTo: 200 },
        { unitAmountDecimal: '30', unitAmountMicroCents: 30000000, upTo: 10000 },
        { unitAmountDecimal: '10', unitAmountMicroCents: 10000000, upTo: 50000 },
        { unitAmountDecimal: '4', unitAmountMicroCents: 4000000, upTo: 300000 },
        { unitAmountDecimal: '1.8', unitAmountMicroCents: 1800000 }
      ]
    },
    {
      currency: 'eur',
      description: 'Small tier - great for growing businesses',
      interval: 'quarter',
      name: 'Small',
      price: 83200, // €832 in cents
      skuType: 'small',
      title: 'Small',
      skuId: 'small_quarterly',
      priceMonthly: 83200,
      userTiers: [
        { unitAmountDecimal: '0', unitAmountMicroCents: 0, upTo: 2000 },
        { unitAmountDecimal: '24', unitAmountMicroCents: 24000000, upTo: 10000 },
        { unitAmountDecimal: '8', unitAmountMicroCents: 8000000, upTo: 50000 },
        { unitAmountDecimal: '3.2', unitAmountMicroCents: 3200000, upTo: 300000 },
        { unitAmountDecimal: '1.44', unitAmountMicroCents: 1440000 }
      ]
    },
    {
      currency: 'eur',
      description: 'Medium tier - ideal for established companies',
      interval: 'quarter',
      name: 'Medium',
      price: 249900, // €2,499 in cents
      skuType: 'medium',
      title: 'Medium',
      skuId: 'medium_quarterly',
      priceMonthly: 249900,
      userTiers: [
        { unitAmountDecimal: '0', unitAmountMicroCents: 0, upTo: 10000 },
        { unitAmountDecimal: '7', unitAmountMicroCents: 7000000, upTo: 50000 },
        { unitAmountDecimal: '2.8', unitAmountMicroCents: 2800000, upTo: 300000 },
        { unitAmountDecimal: '1.26', unitAmountMicroCents: 1260000 }
      ]
    },
    {
      currency: 'eur',
      description: 'Large tier - perfect for enterprise solutions',
      interval: 'quarter',
      name: 'Large',
      price: 416500, // €4,165 in cents
      skuType: 'large',
      title: 'Large',
      skuId: 'large_quarterly',
      priceMonthly: 416500,
      userTiers: [
        { unitAmountDecimal: '0', unitAmountMicroCents: 0, upTo: 100000 },
        { unitAmountDecimal: '2.4', unitAmountMicroCents: 2400000, upTo: 300000 },
        { unitAmountDecimal: '1.08', unitAmountMicroCents: 1080000 }
      ]
    }
  ]
}

// Fetch pricing data from API (fallback to mock data)
async function fetchPricingData(): Promise<Sku[]> {
  return new Promise((resolve, reject) => {
    // Try to fetch from API first
    const url = 'https://api.choicely.com/stripe/saas_tiers/'

    const req = https.get(url, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const response: ApiResponse = JSON.parse(data)
          if (response.data && response.data.length > 0) {
            resolve(response.data)
          } else {
            // Fallback to mock data
            resolve(getMockPricingData())
          }
        } catch (error) {
          // Fallback to mock data
          resolve(getMockPricingData())
        }
      })
    })

    req.on('error', (error) => {
      // Fallback to mock data
      resolve(getMockPricingData())
    })

    // Timeout after 5 seconds
    req.setTimeout(5000, () => {
      req.destroy()
      resolve(getMockPricingData())
    })
  })
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  const mauArg = args[0]

  try {
    console.log('Fetching latest pricing data...\n')
    const skus = await fetchPricingData()

    if (skus.length === 0) {
      console.log('❌ No pricing data available. Please try again later.')
      process.exit(1)
    }

    const mau = mauArg ? parseInt(mauArg, 10) : undefined
    if (mauArg && isNaN(mau!)) {
      console.log('❌ Invalid MAU value. Please provide a number.')
      process.exit(1)
    }

    displayPricingTable(skus, mau)

  } catch (error: any) {
    console.error('❌ Error fetching pricing data:', error.message)
    console.log('\n💡 Please visit [choicely.com](https://choicely.com) for the latest pricing information.')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { fetchPricingData, displayPricingTable, getRecommendedTier }