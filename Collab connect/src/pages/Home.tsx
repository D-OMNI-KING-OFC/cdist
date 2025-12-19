import { useState, useEffect } from "react"
import Auth from "../components/Auth"
import { t } from "../i18n/index"

type HomeProps = {
  lang: string
}

export default function Home({ lang }: HomeProps) {
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")

  useEffect(() => {
    setTitle(t("welcomeTitle", lang))
    setSubtitle(t("welcomeSubtitle", lang))
  }, [lang])

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <Auth lang={lang} />
    </div>
  )
}

