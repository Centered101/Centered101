import { Code2 } from 'lucide-react'

import { Panel, PageHeading, PanelHead, ProgressBar } from '@/components/work/data/panel'
import { Status, statusTone } from '@/components/work/data/status'
import { Timeline } from '@/components/work/data/timeline'
import { EmptyState } from '@/components/work/states'
import { mockProjects } from '@/lib/work/mock/data'

export const metadata = { title: 'รายละเอียดโปรเจกต์ — flowstate' }

/**
 * Admin project detail.
 *
 * Looks the project up by `project_code` because that is all the mock data
 * carries. From Phase 2 the segment is the project UUID and this becomes a
 * Supabase query; `project_code` stays display-only (docs/ARCHITECTURE.md §5).
 *
 * A missing project renders an empty state rather than 404-ing, because with
 * mock data "not found" is expected for most ids. Once real data lands this
 * calls `notFound()` instead.
 */
export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = mockProjects.find((p) => p.id === id)

  if (!project) {
    return (
      <>
        <PageHeading
          eyebrow={id}
          title="ไม่พบโปรเจกต์"
          description="ยังไม่มีข้อมูลโปรเจกต์นี้"
        />
        <EmptyState
          title="ไม่พบโปรเจกต์"
          description="ข้อมูลโปรเจกต์จะเชื่อมต่อกับฐานข้อมูลจริงในเฟส 5"
        />
      </>
    )
  }

  return (
    <>
      <PageHeading
        eyebrow={project.id}
        title={project.name}
        description={project.client}
        action={<Status tone={statusTone(project.status)}>{project.status}</Status>}
      />

      <section className="client-main">
        <Panel className="project-hero">
          <div className="hero-top">
            <div className={`project-icon ${project.tone} large`}>
              <Code2 size={22} />
            </div>
            <div>
              <p className="eyebrow">{project.id}</p>
              <h2>{project.name}</h2>
              <p className="muted">{project.client}</p>
            </div>
            <Status tone={statusTone(project.status)}>{project.status}</Status>
          </div>
          <div className="big-progress">
            <div>
              <span>ความคืบหน้าโปรเจกต์</span>
              <strong>{project.progress}%</strong>
            </div>
            <div className="progress">
              <span style={{ width: `${project.progress}%` }} />
            </div>
          </div>
          <div className="hero-details">
            <div>
              <span>มูลค่าโปรเจกต์</span>
              <strong>{project.amount}</strong>
            </div>
            <div>
              <span>ชำระแล้ว</span>
              <strong className="green-text">{project.paid}</strong>
            </div>
            <div>
              <span>ความคืบหน้า</span>
              <ProgressBar value={project.progress} />
            </div>
          </div>
        </Panel>

        <Panel className="timeline-panel">
          <PanelHead title="ไทม์ไลน์โปรเจกต์" description="ติดตามทุกขั้นตอนจนเปิดใช้งาน" />
          <Timeline />
        </Panel>
      </section>
    </>
  )
}
