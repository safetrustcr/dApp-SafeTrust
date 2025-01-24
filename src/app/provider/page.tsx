import React from 'react'
import Header from './components/Header'
import PerformanceStat from './components/PerformanceStat'
import ReviewSections from './components/ReviewSections'
import ServiceTable from './components/ServiceTable'

export default function page() {
  return (
    <div>
        <Header />
        <PerformanceStat />
        <ReviewSections />
        <ServiceTable />
    </div>
  )
}
