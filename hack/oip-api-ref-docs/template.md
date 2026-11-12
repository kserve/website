---
title: gRPC API Reference
---

{{range $file := .Files}}

{{range $service := .Services -}}
{{range .Methods -}}

### {{.Name}}

{{ .Description}}

> rpc {{$file.Package}}.{{$service.Name}}/{{.Name}}([{{.RequestLongType}}](#{{.RequestLongType | lower | replace "." ""}}))
>   returns [{{.ResponseLongType}}](#{{.ResponseLongType | lower | replace "." ""}})

{{end}}
{{end}}

------
### Messages

{{range .Messages}}

#### {{.LongName}}

{{.Description}}

{{if .HasFields}}
| Field | Type | Description |
| ----- | ---- | ----------- |
{{range $field := .Fields -}}
{{- /* Fragments must equal the Docusaurus heading slug, which lowercases and drops dots. Scalars have no section, so they are not linked. */ -}}
{{- $scalar := false -}}
{{- range $.Scalars}}{{if eq .ProtoType $field.LongType}}{{$scalar = true}}{{end}}{{end -}}
{{- $type := .LongType -}}
{{- if .IsMap}}{{$type = printf "map %s" .LongType}}{{else if .Label}}{{$type = printf "%s %s" .Label .LongType}}{{end -}}
| {{if .IsOneof}}[oneof](https://developers.google.com/protocol-buffers/docs/proto3#oneof) {{.OneofDecl}}.{{end}}{{.Name}} | {{if $scalar}}{{$type}}{{else}}[{{$type}}](#{{.LongType | lower | replace "." ""}}){{end}} | {{if .Description}}{{nobr .Description}}{{else}}N/A{{end}} |
{{end}}
{{end}}
{{end}}

{{end}}
