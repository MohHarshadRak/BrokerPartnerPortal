// Renders <optgroup> per masterplan from a live projects list — shared by
// any form that needs a "project of interest" style dropdown.
function ProjectOptions({ projects }) {
  const grouped = projects.reduce((acc, project) => {
    const group = project.masterplan || 'Other'
    ;(acc[group] ||= []).push(project)
    return acc
  }, {})

  return Object.entries(grouped).map(([group, list]) => (
    <optgroup label={group} key={group}>
      {list.map((project) => (
        <option value={project.name} key={project.id}>
          {project.name}
        </option>
      ))}
    </optgroup>
  ))
}

export default ProjectOptions
